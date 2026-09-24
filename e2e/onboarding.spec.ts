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

  test("signup completes the 4-step wizard and lands on Workspace", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    test.setTimeout(90_000);
    const email = `e2e-onboarding-${Date.now()}@example.com`;

    // AuthCard's inputs are React-controlled — a fill() that lands before the
    // client bundle hydrates gets silently reset back to "" once React
    // attaches (the DOM value change never reaches its onChange). Re-checking
    // and re-filling right before submit is a race-proof guard regardless of
    // exactly when hydration finishes.
    await page.goto("/sign-up");
    const emailInput = page.locator('input[type="email"]');
    const passwordInputs = page.locator('input[type="password"]');
    await emailInput.fill(email);
    await passwordInputs.nth(0).fill(TEST_PASSWORD);
    await passwordInputs.nth(1).fill(TEST_PASSWORD);
    await page.waitForTimeout(300);
    if ((await emailInput.inputValue()) !== email) await emailInput.fill(email);
    if ((await passwordInputs.nth(0).inputValue()) !== TEST_PASSWORD) await passwordInputs.nth(0).fill(TEST_PASSWORD);
    if ((await passwordInputs.nth(1).inputValue()) !== TEST_PASSWORD) await passwordInputs.nth(1).fill(TEST_PASSWORD);
    const signupSubmit = page.locator('button[type="submit"]')
      .click({ timeout: 20_000 })
      .catch(() => undefined);

    // Signup confirms and signs in the account itself; capture its ID for
    // cleanup while the browser follows the real post-signup redirect.
    await expect.poll(async () => {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const created = data.users.find((u) => u.email === email);
      userId = created?.id;
      return Boolean(userId);
    }, { timeout: 30_000, intervals: [500, 1_000] }).toBe(true);

    await expect(page).toHaveURL(/onboarding/, { timeout: 30_000 });
    await signupSubmit;
    const nameInput = page.locator('input[placeholder="Alex Tremblay"]');
    await expect(nameInput).toBeVisible({ timeout: 15000 });

    await nameInput.fill("E2E Test User");
    await page.getByPlaceholder("Ex : Bistro du Coin").fill("E2E Bistro");
    await page.getByRole("button", { name: /^continuer$/i }).click();
    await expect(page.getByRole("heading", { name: "Connectez vos outils" })).toBeVisible({ timeout: 15_000 });

    // Tool connections and team invites are optional; use their visible skip
    // actions and let the actual completion action persist onboarding state.
    await page.getByRole("button", { name: /plus tard/i }).click();
    await expect(page.getByRole("heading", { name: "Invitez votre équipe" })).toBeVisible();

    await page.getByRole("button", { name: /plus tard, terminer sans inviter/i }).click();
    // The post-completion client-side redirect has been flaky under
    // Playwright's default waitForURL (likely the service worker interfering
    // with the "load" event) even though the server confirms success — poll
    // for the URL instead of waiting on a single load event.
    await expect(page).toHaveURL(/workspace/, { timeout: 15000 });
  });
});
