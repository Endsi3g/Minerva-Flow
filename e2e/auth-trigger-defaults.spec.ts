import { expect, test } from "@playwright/test";
import { cleanupTestUser, supabaseAdmin, TEST_PASSWORD } from "./fixtures";

test("signup creates a profile with optional product-update consent off by default", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const email = `auth-trigger-defaults-${Date.now()}@example.com`;
  let userId: string | undefined;

  try {
    await page.goto("/sign-up");
    const emailInput = page.locator('input[type="email"]');
    const passwords = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible({ timeout: 30_000 });
    await emailInput.fill(email);
    await passwords.nth(0).fill(TEST_PASSWORD);
    await passwords.nth(1).fill(TEST_PASSWORD);
    // The AuthCard keeps its submit handler busy while the browser establishes
    // the Supabase session. Observe the server-side signup independently so a
    // delayed client redirect does not hide whether account creation worked.
    const submitInFlight = page.locator('button[type="submit"]')
      .click({ timeout: 20_000 })
      .catch(() => undefined);

    await expect.poll(async () => {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const created = data.users.find((user) => user.email === email);
      userId = created?.id;
      return Boolean(userId);
    }, { timeout: 30_000, intervals: [500, 1_000] }).toBe(true);

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("product_updates_opt_in, product_updates_opt_in_at, onboarding_completed")
      .eq("id", userId!)
      .single();

    expect(error).toBeNull();
    expect(profile).toMatchObject({
      product_updates_opt_in: false,
      product_updates_opt_in_at: null,
      onboarding_completed: false,
    });
    await expect(page).toHaveURL(/(?:workspace|overview|onboarding)/, { timeout: 60_000 });
    await submitInFlight;
  } finally {
    if (userId) await cleanupTestUser(userId);
  }
});

test("Auth trigger accepts signup metadata with the optional consent omitted", async () => {
  const email = `auth-trigger-omitted-${Date.now()}@example.com`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  expect(error).toBeNull();
  expect(data.user).toBeTruthy();

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("product_updates_opt_in, product_updates_opt_in_at, onboarding_completed")
      .eq("id", data.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toMatchObject({
      product_updates_opt_in: false,
      product_updates_opt_in_at: null,
      onboarding_completed: false,
    });
  } finally {
    await cleanupTestUser(data.user!.id);
  }
});
