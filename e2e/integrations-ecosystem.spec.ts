import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, loginAs, supabaseAdmin } from "./fixtures";

test.describe("Integrations Ecosystem (Google Workspace & Accounting)", () => {
  let user: { id: string; email: string; password: string };
  let restaurantId: string;

  test.beforeAll(async () => {
    user = await createTestUser("integrations-e2e");
    const { data: rest, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .insert({ name: "Brasserie E2E Intégrations", service_model: "table" })
      .select("id")
      .single();
    if (restErr || !rest) throw new Error("Failed to create test restaurant");
    restaurantId = rest.id;

    await supabaseAdmin.from("restaurant_members").insert({
      restaurant_id: restaurantId,
      user_id: user.id,
      role: "owner",
    });
  });

  test.afterAll(async () => {
    if (restaurantId) {
      await supabaseAdmin.from("restaurants").delete().eq("id", restaurantId);
    }
    if (user?.id) {
      await cleanupTestUser(user.id);
    }
  });

  test("verifies Google Workspace pills and extended Accounting cards in /settings", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, user);

    // Navigate to Settings Integrations tab
    await page.goto("/settings?tab=integrations");

    // 1. Google Workspace Card & Pills
    await expect(page.getByText("Google Workspace")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Google", exact: true })).toBeVisible();

    // The Connect surface must be reachable, but only report a ready state
    // after a restaurant has completed its hosted onboarding.
    const stripeCard = page.getByText("Paiements en ligne des clients").locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    await expect(stripeCard).toBeVisible();
    await expect(stripeCard.getByText("Non connecté")).toBeVisible({ timeout: 20_000 });
    await expect(stripeCard.getByRole("button", { name: "Connecter Stripe" })).toBeVisible();
    const verifyArtifactsDir = process.env.VERIFY_ARTIFACTS_DIR;
    if (verifyArtifactsDir) {
      await stripeCard.screenshot({ path: `${verifyArtifactsDir}/screens/stripe-connect-desktop.png` });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(stripeCard.getByRole("button", { name: "Connecter Stripe" })).toBeVisible();
      await stripeCard.screenshot({ path: `${verifyArtifactsDir}/screens/stripe-connect-mobile.png` });
      await page.setViewportSize({ width: 1440, height: 900 });
    }

    // Verify all Google service pills with SVG icons are rendered
    await expect(page.getByText("Gmail", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Calendar", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Sheets", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Drive", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Analytics GA4").first()).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^Google Ads$/ }).first()).toBeVisible();

    // Verify Connect button
    await expect(page.getByRole("button", { name: /Connecter Google/i })).toBeVisible();

    // 2. Accounting & Invoicing Card
    await expect(page.getByText("Logiciels Comptables").first()).toBeVisible();
    await expect(page.locator("p", { hasText: "QuickBooks Online" })).toBeVisible();
    await expect(page.locator("p", { hasText: "Xero" })).toBeVisible();
    await expect(page.locator("p", { hasText: "Sage Business Cloud" })).toBeVisible();
    await expect(page.locator("p", { hasText: "FreshBooks" })).toBeVisible();
    await expect(page.locator("p", { hasText: "Dext (Receipt Bank)" })).toBeVisible();
    await expect(page.locator("p", { hasText: "Pennylane" })).toBeVisible();

    // 3. Request Access Interaction on an Accounting Service
    const requestFreshBooksBtn = page.getByRole("button", { name: /Demander l'accès/i }).first();
    await expect(requestFreshBooksBtn).toBeVisible();
    await requestFreshBooksBtn.click();
    await expect(page.getByText(/Demande enregistrée/i).first()).toBeVisible();
  });
});
