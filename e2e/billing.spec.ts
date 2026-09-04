import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, loginAs, supabaseAdmin, type TestUser } from "./fixtures";
import {
  stripeConfiguredForTests,
  testStripeClient,
  createTestSubscription,
  deliverWebhookEvent,
  buildCheckoutCompletedEvent,
  buildSubscriptionUpdatedEvent,
} from "./stripe-helpers";

/**
 * Covers the Minerva Flow ↔ Stripe billing integration end to end: the
 * 3-tier pricing table, checkout → webhook → DB/UI sync, the AI-quota and
 * establishment-limit upsell paths, and the cancellation flow. Every test
 * that needs Stripe skips itself (rather than failing) when
 * STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET/STRIPE_PRICE_* aren't set — see
 * stripe-helpers.ts for why webhook delivery is simulated rather than
 * forwarded live.
 */
test.describe("Billing", () => {
  let user: TestUser;
  let workspaceId: string;

  test.beforeEach(async () => {
    test.skip(!stripeConfiguredForTests(), "Stripe env vars not configured for this run — see .env.local");
    user = await createTestUser("billing");
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .single();
    workspaceId = membership!.workspace_id as string;
  });

  test.afterEach(async () => {
    if (workspaceId) {
      await supabaseAdmin.from("subscription_cancellations").delete().eq("workspace_id", workspaceId);
      await supabaseAdmin.from("workspace_billing_emails").delete().eq("workspace_id", workspaceId);
      await supabaseAdmin.from("subscriptions").delete().eq("workspace_id", workspaceId);
    }
    if (user?.id) await cleanupTestUser(user.id);
  });

  test("pricing table shows Starter, Pro and an Entreprise contact card", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/billing");

    await expect(page.getByText("Choisissez votre forfait")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Starter", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Entreprise", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("149")).toBeVisible();
    await expect(page.getByText("299")).toBeVisible();
    await expect(page.getByRole("button", { name: /contacter les ventes/i })).toBeVisible();
  });

  test("selecting Starter redirects to a real Stripe test-mode Checkout session", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/billing");

    const [, response] = await Promise.all([
      page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 }),
      page.getByRole("button", { name: /choisir starter/i }).first().click(),
    ]);
    void response;

    expect(page.url()).toContain("checkout.stripe.com");
  });

  test("checkout.session.completed activates the subscription and syncs the AI quota tier", async ({
    page,
    baseURL,
  }) => {
    const { customerId, subscription } = await createTestSubscription({
      priceId: process.env.STRIPE_PRICE_PRO_MONTHLY!,
      workspaceId,
      tier: "pro",
      interval: "monthly",
      email: user.email,
    });

    const res = await deliverWebhookEvent(
      baseURL!,
      buildCheckoutCompletedEvent({ workspaceId, customerId, subscriptionId: subscription.id })
    );
    expect(res.ok).toBe(true);

    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select("status, plan_tier, stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .single();
    expect(subRow?.plan_tier).toBe("pro");
    expect(subRow?.stripe_customer_id).toBe(customerId);

    const { data: usageRow } = await supabaseAdmin
      .from("workspace_ai_usage")
      .select("plan_tier, monthly_token_quota")
      .eq("workspace_id", workspaceId)
      .single();
    expect(usageRow?.plan_tier).toBe("pro");
    expect(usageRow?.monthly_token_quota).toBe(500_000);

    await loginAs(page, user);
    await page.goto("/billing");
    await expect(page.getByText("Plan Pro")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Actif")).toBeVisible();

    await testStripeClient().subscriptions.cancel(subscription.id);
  });

  test("a past_due transition shows the payment banner and starts the dunning clock", async ({ page, baseURL }) => {
    const { customerId, subscription } = await createTestSubscription({
      priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
      workspaceId,
      tier: "starter",
      interval: "monthly",
      email: user.email,
    });
    await deliverWebhookEvent(
      baseURL!,
      buildCheckoutCompletedEvent({ workspaceId, customerId, subscriptionId: subscription.id })
    );

    // Simulate what Stripe sends when a renewal invoice fails — the webhook
    // can't be told to actually fail a real charge from here, so this
    // constructs the subscription.updated event Stripe would deliver, with
    // status flipped to past_due.
    const pastDue = { ...subscription, status: "past_due" as const };
    await deliverWebhookEvent(baseURL!, buildSubscriptionUpdatedEvent(pastDue, "active"));

    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select("status, past_due_since")
      .eq("workspace_id", workspaceId)
      .single();
    expect(subRow?.status).toBe("past_due");
    expect(subRow?.past_due_since).toBeTruthy();

    await loginAs(page, user);
    await page.goto("/billing");
    await expect(page.getByText("Paiement en retard").first()).toBeVisible({ timeout: 10000 });

    await testStripeClient().subscriptions.cancel(subscription.id);
  });

  test("cancelling schedules cancel_at_period_end and records the exit reason", async ({ page, baseURL }) => {
    const { customerId, subscription } = await createTestSubscription({
      priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
      workspaceId,
      tier: "starter",
      interval: "monthly",
      email: user.email,
    });
    await deliverWebhookEvent(
      baseURL!,
      buildCheckoutCompletedEvent({ workspaceId, customerId, subscriptionId: subscription.id })
    );

    await loginAs(page, user);
    await page.goto("/billing");
    await expect(page.getByText("Plan Starter")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Annuler mon abonnement" }).click();
    await page.getByLabel(/manque des fonctionnalités/i).check();
    await page.getByRole("button", { name: "Continuer" }).click();

    await expect(page.getByRole("button", { name: /continuer l'annulation/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /continuer l'annulation/i }).click();
    await page.getByRole("button", { name: /oui, annuler mon abonnement/i }).click();

    await expect(page.getByText(/abonnement en cours d'annulation/i)).toBeVisible({ timeout: 10000 });

    const live = await testStripeClient().subscriptions.retrieve(subscription.id);
    expect(live.cancel_at_period_end).toBe(true);

    const { data: cancellation } = await supabaseAdmin
      .from("subscription_cancellations")
      .select("reason, retention_offer_accepted")
      .eq("workspace_id", workspaceId)
      .single();
    expect(cancellation?.reason).toBe("missing_features");
    expect(cancellation?.retention_offer_accepted).toBe(false);

    await testStripeClient().subscriptions.cancel(subscription.id);
  });

  test("a Starter workspace hitting the 1-establishment limit sees the upgrade modal, not the form", async ({
    page,
  }) => {
    // No active subscription yet — getWorkspaceAiUsage() defaults to
    // Starter, matching a real not-yet-subscribed workspace.
    await loginAs(page, user);
    await page.goto("/etablissement");

    await page.getByRole("button", { name: /ajouter un établissement/i }).click();
    await expect(page.getByText(/passez à flow pro pour ajouter un établissement/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("textbox", { name: /nom/i })).not.toBeVisible();
  });

  test("quota banners appear at 80% and 100% of the plan's monthly AI tokens", async ({ page }) => {
    await supabaseAdmin.from("workspace_ai_usage").upsert(
      {
        workspace_id: workspaceId,
        plan_tier: "starter",
        monthly_token_quota: 100_000,
        tokens_used_current_period: 85_000,
      },
      { onConflict: "workspace_id" }
    );

    await loginAs(page, user);
    await page.goto("/billing");
    await expect(page.getByText(/quota flow ai bientôt atteint/i)).toBeVisible({ timeout: 10000 });

    await supabaseAdmin
      .from("workspace_ai_usage")
      .update({ tokens_used_current_period: 100_000 })
      .eq("workspace_id", workspaceId);
    await page.reload();
    await expect(page.getByText(/quota flow ai atteint/i)).toBeVisible({ timeout: 10000 });
  });
});
