import { test, expect } from "@playwright/test";
import { supabaseAdmin, cleanupTestUser, cleanupOrphanRestaurants, TEST_PASSWORD } from "./fixtures";

// Full signup path, unlike the other specs — this is the one place we
// actually want a brand-new, unconfigured user going through the wizard.
test.describe("Onboarding", () => {
  let userId: string | undefined;

  test.afterEach(async () => {
    if (userId) await cleanupTestUser(userId);
    await cleanupOrphanRestaurants();
    userId = undefined;
  });

  test("signup configures loyalty, creates its QR, and completes the 4-step wizard", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 810 });
    const email = `e2e-onboarding-${Date.now()}@example.com`;

    // Wait for the form, then use Playwright fill so React receives the input
    // events before submitting.
    await page.goto("/sign-up");
    const emailInput = page.locator('input[type="email"]');
    const passwordInputs = page.locator('input[type="password"]');
    await emailInput.fill(email);
    await passwordInputs.nth(0).fill(TEST_PASSWORD);
    await passwordInputs.nth(1).fill(TEST_PASSWORD);
    const signupSubmit = page.locator('button[type="submit"]')
      .click({ timeout: 60_000 })
      .catch(() => undefined);

    // Signup confirms and signs in the account itself; capture its ID for
    // cleanup while the browser follows the real post-signup redirect.
    await expect.poll(async () => {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const created = data.users.find((u) => u.email === email);
      userId = created?.id;
      return Boolean(userId);
    }, { timeout: 60_000, intervals: [500, 1_000] }).toBe(true);

    await page.waitForURL(/onboarding/, { timeout: 60_000, waitUntil: "commit" });
    await signupSubmit;
    const nameInput = page.locator('input[placeholder="Alex Tremblay"]');
    await expect(nameInput).toBeVisible({ timeout: 60_000 });

    // Prove the controlled onboarding form has hydrated before filling. The
    // server can render visible fields before React attaches their handlers.
    const serviceModelGroup = page.getByRole("radiogroup", { name: "serviceModel" });
    const cafeChoice = serviceModelGroup.locator("label").filter({ hasText: "Café" });
    const restaurantChoice = serviceModelGroup.locator("label").filter({ hasText: "Restaurant" });
    await cafeChoice.click();
    await expect(cafeChoice.locator('input[type="radio"]')).toBeChecked();
    await restaurantChoice.click();
    await expect(restaurantChoice.locator('input[type="radio"]')).toBeChecked();

    await nameInput.fill("E2E Test User");
    const restaurantNameInput = page.getByPlaceholder("Ex : Bistro du Coin");
    await restaurantNameInput.fill("E2E Bistro");
    const profileContinue = page.getByRole("button", { name: /^continuer$/i });
    // If the first fill landed before React finished hydrating, change the
    // value and restore it so the live controlled inputs receive fresh events.
    for (let attempt = 0; attempt < 3 && await profileContinue.isDisabled(); attempt++) {
      await nameInput.fill(`E2E User ${attempt}`);
      await nameInput.fill("E2E Test User");
      await restaurantNameInput.fill(`E2E Bistro ${attempt}`);
      await restaurantNameInput.fill("E2E Bistro");
      await page.waitForTimeout(500);
    }
    await expect(profileContinue).toBeEnabled({ timeout: 15_000 });
    await profileContinue.click();
    await expect(page.getByRole("heading", { name: "Connectez vos outils" })).toBeVisible({ timeout: 60_000 });

    // Connections are optional; loyalty setup is required before completing.
    await page.getByRole("button", { name: /plus tard/i }).click();
    await expect(page.getByRole("heading", { name: "Préparez les inscriptions fidélité" })).toBeVisible();
    await page.screenshot({ path: ".verify-artifacts/20260926T0340Z/screenshots/onboarding-loyalty-setup-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: ".verify-artifacts/20260926T0340Z/screenshots/onboarding-loyalty-setup-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 810 });

    await page.getByRole("button", { name: "Créer mon lien et mon QR" }).click();
    const loyaltyQr = page.getByRole("img", { name: /QR d’inscription au programme de fidélité/i });
    await expect(loyaltyQr).toBeVisible({ timeout: 30_000 });
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", userId!)
      .single();
    expect(membershipError).toBeNull();
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("loyalty_points_per_dollar")
      .eq("id", membership!.restaurant_id)
      .single();
    expect(restaurantError).toBeNull();
    expect(restaurant?.loyalty_points_per_dollar).toBe(1);
    await page.screenshot({ path: ".verify-artifacts/20260926T0340Z/screenshots/onboarding-loyalty-qr-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: ".verify-artifacts/20260926T0340Z/screenshots/onboarding-loyalty-qr-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 810 });

    await page.getByRole("button", { name: /^continuer$/i }).click();
    await expect(page.getByRole("heading", { name: "Invitez votre équipe" })).toBeVisible();

    await page.getByRole("button", { name: /plus tard, terminer sans inviter/i }).click();
    await page.waitForURL(/workspace/, { timeout: 60_000, waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: "Mon workspace" })).toBeVisible({ timeout: 60_000 });
  });
});
