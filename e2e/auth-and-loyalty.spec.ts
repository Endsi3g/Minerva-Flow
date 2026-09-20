import { test, expect } from "@playwright/test";
import { supabaseAdmin, cleanupTestUser, TEST_PASSWORD } from "./fixtures";

test.describe("Auth, Loyalty Focus & Finance Removal", () => {
  let createdUserId: string | undefined;

  test.afterEach(async () => {
    if (createdUserId) {
      await cleanupTestUser(createdUserId);
      createdUserId = undefined;
    }
  });

  test("1. Instant signup with email & password logs in immediately without email confirmation wall", async ({ page }) => {
    const email = `instant-user-${Date.now()}@example.com`;

    await page.goto("/sign-up");
    const emailInput = page.locator('input[type="email"]');
    const passwordInputs = page.locator('input[type="password"]');
    await emailInput.fill(email);
    await passwordInputs.nth(0).fill(TEST_PASSWORD);
    await passwordInputs.nth(1).fill(TEST_PASSWORD);

    // Wait a beat for React hydration stability
    await page.waitForTimeout(300);
    if ((await emailInput.inputValue()) !== email) await emailInput.fill(email);
    if ((await passwordInputs.nth(0).inputValue()) !== TEST_PASSWORD) await passwordInputs.nth(0).fill(TEST_PASSWORD);
    if ((await passwordInputs.nth(1).inputValue()) !== TEST_PASSWORD) await passwordInputs.nth(1).fill(TEST_PASSWORD);

    await page.click('button[type="submit"]');

    // Should NOT get stuck on /sign-up-success; user gets immediately redirected into the app
    await page.waitForURL(/\/(overview|onboarding)/, { timeout: 25000 });
    expect(page.url()).not.toContain("sign-up-success");

    // Track for cleanup
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
    const u = data.users.find((user) => user.email === email);
    if (u) createdUserId = u.id;
  });

  test("2. Duplicate signup displays explicit error immediately", async ({ page }) => {
    await page.goto("/sign-up");
    await page.fill('input[type="email"]', "clalondeofficial@gmail.com");
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill("DifferentPassword123!");
    await passwordInputs.nth(1).fill("DifferentPassword123!");
    await page.click('button[type="submit"]');

    const errorBanner = page.locator(".bg-mv-red-bg");
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
    const text = await errorBanner.textContent();
    expect(text?.length).toBeGreaterThan(5);
    expect(page.url()).not.toContain("sign-up-success");
  });

  test("3. Christian Lalonde logs in successfully with his credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "clalondeofficial@gmail.com");
    await page.fill('input[type="password"]', "MinervaFlow2026!");
    await page.click('button[type="submit"]');

    // Should successfully log in and leave the login page
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 20000 });
  });

  test("4. /finance redirects automatically to /fidelisation", async ({ page }) => {
    // Ensure onboarding is marked complete so protected route guards let the user through
    await supabaseAdmin.from("profiles").update({ onboarding_completed: true }).eq("email", "clalondeofficial@gmail.com");

    // Log in first with Christian
    await page.goto("/login");
    await page.fill('input[type="email"]', "clalondeofficial@gmail.com");
    await page.fill('input[type="password"]', "MinervaFlow2026!");
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 20000 });

    // Navigate to /finance
    await page.goto("/finance");
    await page.waitForURL(/\/fidelisation/, { timeout: 15000 });
    expect(page.url()).toContain("/fidelisation");

    // Check sidebar does not have link to /finance
    const financeNavLink = page.locator('aside a[href*="/finance"], nav a[href*="/finance"]');
    await expect(financeNavLink).toHaveCount(0);

    // Check overview has loyalty return rate
    await page.goto("/overview");
    await page.waitForLoadState("networkidle");
    const overviewText = await page.textContent("body");
    expect(overviewText).toContain("Taux de retour");
    expect(overviewText).not.toContain("Marge cumulée du mois");

    // Take screenshot of overview
    await page.screenshot({ path: "test-results/verified-overview-loyalty.png", fullPage: true });
  });

  test("5. Capture login page with new loyalty copy", async ({ page }) => {
    await page.goto("/fr/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/verified-login-loyalty.png", fullPage: true });
  });

  test("6. Capture signup page with new loyalty copy", async ({ page }) => {
    await page.goto("/fr/sign-up");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/verified-signup-loyalty.png", fullPage: true });
  });
});
