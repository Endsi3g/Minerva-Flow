import { test, expect } from "@playwright/test";
import { supabaseAdmin, cleanupTestUser, createTestUser, loginAs, TEST_PASSWORD } from "./fixtures";

test.describe("Auth, Role Navigation & Core Workflows", () => {
  test.use({ locale: "fr-CA" });
  let createdUserId: string | undefined;

  test.afterEach(async () => {
    if (createdUserId) {
      await cleanupTestUser(createdUserId);
      createdUserId = undefined;
    }
  });

  test("1. Instant signup with email & password logs in immediately without email confirmation wall", async ({ page, context }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const email = `instant-user-${Date.now()}@example.com`;

    await page.goto("/sign-up");
    const emailInput = page.locator('input[type="email"]');
    const passwordInputs = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible({ timeout: 30000 });
    await emailInput.fill(email);
    await passwordInputs.nth(0).fill(TEST_PASSWORD);
    await passwordInputs.nth(1).fill(TEST_PASSWORD);

    // Wait a beat for React hydration stability
    await page.waitForTimeout(300);
    if ((await emailInput.inputValue()) !== email) await emailInput.fill(email);
    if ((await passwordInputs.nth(0).inputValue()) !== TEST_PASSWORD) await passwordInputs.nth(0).fill(TEST_PASSWORD);
    if ((await passwordInputs.nth(1).inputValue()) !== TEST_PASSWORD) await passwordInputs.nth(1).fill(TEST_PASSWORD);

    const submitInFlight = page.locator('button[type="submit"]')
      .click({ timeout: 20000 })
      .catch(() => undefined);

    // Confirm the server action created the account independently from the
    // client-side route transition, then verify that Auth issued a session.
    await expect.poll(async () => {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const created = data.users.find((user) => user.email === email);
      createdUserId = created?.id;
      return Boolean(createdUserId);
    }, { timeout: 30000, intervals: [500, 1000] }).toBe(true);

    await page.waitForURL(/\/(workspace|overview|onboarding)(?:[/?#]|$)/, {
      timeout: 30000,
      waitUntil: "commit",
    });
    await expect.poll(async () => (await context.cookies()).some((cookie) =>
      /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name) && cookie.value.length > 0
    ), { timeout: 15000, intervals: [500, 1000] }).toBe(true);
    await submitInFlight;
    expect(page.url()).not.toContain("sign-up-success");
  });

  test("2. Duplicate signup displays explicit error immediately", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const email = `duplicate-signup-${Date.now()}@example.com`;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`Could not create duplicate-signup fixture: ${error?.message}`);
    createdUserId = data.user.id;

    await page.goto("/sign-up");
    await page.locator('input[type="email"]').fill(email);
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

  test("3. A confirmed account logs in through the real form", async ({ page }) => {
    test.setTimeout(90_000);
    const user = await createTestUser("auth-login");
    createdUserId = user.id;
    await loginAs(page, user);
    await expect(page.getByRole("button", { name: user.email })).toBeVisible();
  });

  test("4. owner core workflows stay visible and their routes remain reachable", async ({ page }) => {
    test.setTimeout(90_000);
    const user = await createTestUser("finance-redirect");
    createdUserId = user.id;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    expect(error).toBeNull();
    await loginAs(page, user);

    const primaryNav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(primaryNav.getByRole("link", { name: "Aperçu" })).toBeVisible();
    await expect(primaryNav.getByRole("link", { name: "Flow AI" })).toBeVisible();
    await expect(primaryNav.getByRole("link", { name: "Menu" })).toBeVisible();
    await expect(primaryNav.getByRole("link", { name: "Fidélisation" })).toBeVisible();

    const dailyGroup = page.getByRole("button", { name: "Gestion quotidienne" });
    await expect(dailyGroup).toHaveAttribute("aria-expanded", "false");
    await dailyGroup.click();
    await expect(dailyGroup).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "Commandes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Finance" })).toBeVisible();

    await page.goto("/fr/menu");
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Menu" })).toBeVisible();
    await page.goto("/fr/fidelisation");
    await expect(page).toHaveURL(/\/fidelisation$/);
    await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Fidélisation" })).toBeVisible();

    await page.goto("/fr/unknown-product-route");
    await page.waitForURL(/\/workspace$/, { timeout: 15000 });
    await page.screenshot({ path: "test-results/verified-owner-core-navigation.png", fullPage: true });
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
