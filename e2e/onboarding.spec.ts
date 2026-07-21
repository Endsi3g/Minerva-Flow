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

  test("signup completes the 3-step wizard and lands on Overview", async ({ page }) => {
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
    await page.click('button[type="submit"]');

    // Confirm the account server-side so the test doesn't depend on email
    // delivery — mirrors what a real "click the confirmation link" would do.
    await page.waitForTimeout(1000);
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const created = data.users.find((u) => u.email === email);
    expect(created).toBeDefined();
    userId = created!.id;
    await supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true });

    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/overview/, { timeout: 15000 });

    // Step 1's inner feature carousel advances before moving to step 2 —
    // click "Suivant" until the step-2 name field shows up.
    const nameInput = page.locator('input[placeholder="Alex Tremblay"]');
    for (let i = 0; i < 6 && !(await nameInput.isVisible().catch(() => false)); i++) {
      await page.getByRole("button", { name: /suivant/i }).click();
      await page.waitForTimeout(300);
    }
    await expect(nameInput).toBeVisible();

    await nameInput.fill("E2E Test User");
    await page.getByRole("button", { name: /suivant/i }).click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: /commencer/i }).click();
    // The post-completion client-side redirect has been flaky under
    // Playwright's default waitForURL (likely the service worker interfering
    // with the "load" event) even though the server confirms success — poll
    // for the URL instead of waiting on a single load event.
    await expect(page).toHaveURL(/overview/, { timeout: 15000 });
  });
});
