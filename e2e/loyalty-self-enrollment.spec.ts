import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, cleanupOrphanRestaurants, loginAs, supabaseAdmin, type TestUser } from "./fixtures";

// This spec asserts French copy throughout. The public /f/[token] join page
// is hardcoded French JSX so it renders that way regardless of locale, but
// /portal uses real next-intl translation and negotiates off Accept-Language
// when no NEXT_LOCALE cookie exists yet (i18n/routing.ts: defaultLocale
// "fr", localeDetection default on) — Playwright's default context locale
// is en-US, which flips the portal's first render to English. Pin it so
// this test keeps validating the French flow it was written for.
test.use({ locale: "fr-CA" });

test.describe("Loyalty self-enrollment", () => {
  let owner: TestUser | undefined;
  let restaurantId: string;
  let customerUserId: string | null = null;
  let checkoutOrderId: string | null = null;

  test.beforeEach(async () => {
    owner = await createTestUser("loyalty-owner");
    const { data: membership } = await supabaseAdmin
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", owner.id)
      .eq("role", "owner")
      .maybeSingle();
    restaurantId = membership!.restaurant_id as string;
  });

  test.afterEach(async () => {
    if (checkoutOrderId) {
      await supabaseAdmin.from("orders").delete().eq("id", checkoutOrderId).eq("restaurant_id", restaurantId);
    }
    if (customerUserId) await cleanupTestUser(customerUserId).catch(() => {});
    if (owner?.id) await cleanupTestUser(owner.id);
    await cleanupOrphanRestaurants();
  });

  test("a stranger can join, verify a paid checkout return, and clear the completed cart", async ({ page, context }, testInfo) => {
    if (!owner) throw new Error("Owner test account was not provisioned.");
    await loginAs(page, owner);
    // The "nouveau lien" button lived on the main /fidelisation page before
    // it was split into subroutes (see FidelisationSubNav) — it's on
    // /fidelisation/partage now.
    await page.goto("/fidelisation/partage");
    await page.getByRole("button", { name: /nouveau lien/i }).click();
    await page.getByRole("button", { name: /générer le lien/i }).click();
    await expect(page.locator("text=/\\/f\\//")).toBeVisible({ timeout: 10000 });

    const bodyText = await page.locator("body").innerText();
    const tokenMatch = bodyText.match(/\/f\/([a-f0-9]+)/);
    expect(tokenMatch).toBeTruthy();
    const token = tokenMatch![1];
    await context.clearCookies();

    // A real-looking domain — Supabase Auth rejects @example.com as a known
    // non-deliverable test domain (confirmed during manual audit).
    const email = `loyalty-e2e-${Date.now()}@gmail.com`;
    await page.goto(`/f/${token}`);
    await expect(page.getByText(/programme de fidélité/i)).toBeVisible({ timeout: 10000 });
    await page.locator('input[placeholder="Alex Tremblay"]').fill("Client E2E");
    await page.locator('input[type="email"]').fill(email);
    await page.getByRole("button", { name: /rejoindre le programme/i }).click();
    await expect(page.getByText(/vérifiez vos courriels/i)).toBeVisible({ timeout: 10000 });

    await expect(async () => {
      const { data } = await supabaseAdmin.from("customers").select("id, restaurant_id").ilike("email", email).maybeSingle();
      expect(data?.restaurant_id).toBe(restaurantId);
    }).toPass({ timeout: 10000 });

    // Simulate clicking the magic link — no real inbox in CI, so generate the
    // same token_hash Supabase would have emailed and hit /auth/confirm directly.
    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    expect(error).toBeNull();
    expect(linkData?.properties).toBeTruthy();
    const tokenHash = linkData!.properties!.hashed_token;

    const confirmationUrl = `/auth/confirm?token_hash=${tokenHash}&type=magiclink&next=%2Fportal`;
    try {
      await page.goto(confirmationUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
      await expect(page).toHaveURL(/\/portal$/, { timeout: 10_000 });
    } catch (navigationError) {
      // Auth confirmation can set the real Supabase session and redirect while
      // the service worker aborts the initiating navigation. Recover only if
      // the confirmation route already issued a session cookie; never inject
      // one from the test.
      const hasSupabaseSession = (await context.cookies()).some((cookie) =>
        /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name) && cookie.value.length > 0
      );
      if (!hasSupabaseSession) throw navigationError;
      await page.goto("/portal", { waitUntil: "domcontentloaded", timeout: 15_000 });
    }
    await expect(page.getByText(/bonjour client e2e/i)).toBeVisible({ timeout: 10000 });

    const { data: customer } = await supabaseAdmin.from("customers").select("id, user_id").ilike("email", email).maybeSingle();
    expect(customer?.user_id).toBeTruthy();
    customerUserId = customer!.user_id as string;

    const { data: order, error: orderError } = await supabaseAdmin.from("orders").insert({
      restaurant_id: restaurantId,
      customer_id: customer!.id,
      status: "confirmee",
      guest_name: "Client E2E",
      subtotal: 16,
      tax_amount: 2.4,
      total: 18.4,
      payment_method: "Carte (Stripe)",
      payment_status: "paye",
      is_public_request: true,
    }).select("id").single();
    expect(orderError).toBeNull();
    expect(order?.id).toBeTruthy();
    const paidOrderId = order!.id as string;
    checkoutOrderId = paidOrderId;

    // Seed once in the already authenticated portal tab. `addInitScript`
    // would rerun on the payment-return navigation and reintroduce stale cart
    // entries after the app correctly clears them.
    await page.evaluate((customerId: string) => {
      localStorage.setItem(`mv-portal-cart-${customerId}`, JSON.stringify({ "stale-menu-item": 1 }));
      localStorage.setItem(`mv-portal-order-attempt-${customerId}`, "00000000-0000-4000-8000-000000000099");
    }, customer!.id);
    await page.goto(`/portal?payment=return&order=${encodeURIComponent(paidOrderId)}`);
    await expect(page.getByRole("status").getByText("Paiement confirmé")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: testInfo.outputPath("portal-payment-confirmation-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath("portal-payment-confirmation-mobile.png"), fullPage: true });
    await expect.poll(() => page.evaluate((customerId: string) => ({
      cart: localStorage.getItem(`mv-portal-cart-${customerId}`),
      attempt: localStorage.getItem(`mv-portal-order-attempt-${customerId}`),
    }), customer!.id)).toEqual({ cart: null, attempt: null });
  });
});
