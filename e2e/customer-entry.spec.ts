import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, supabaseAdmin, TEST_PASSWORD, type TestUser } from "./fixtures";

test.use({ locale: "fr-CA" });

test("a loyalty customer reaches their portal before owner onboarding", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  let owner: TestUser | undefined;
  let customerUserId: string | undefined;
  let customerId: string | undefined;
  try {
    owner = await createTestUser("customer-entry-owner");
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("restaurant_members").select("restaurant_id").eq("user_id", owner.id).single();
    expect(membershipError).toBeNull();
    const email = `e2e-customer-entry-${Date.now()}@example.com`;
    const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password: TEST_PASSWORD, email_confirm: true,
      user_metadata: { is_customer: true, product_updates_opt_in: false },
    });
    expect(authError).toBeNull();
    customerUserId = auth.user!.id;
    const { error: profileError } = await supabaseAdmin.from("profiles")
      .update({ onboarding_completed: false }).eq("id", customerUserId);
    expect(profileError).toBeNull();
    const { data: customer, error: customerError } = await supabaseAdmin.from("customers")
      .insert({ restaurant_id: membership!.restaurant_id, user_id: customerUserId, email, name: "Client E2E" })
      .select("id").single();
    expect(customerError).toBeNull();
    customerId = customer!.id;
    await page.goto("/fr/login");
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await emailInput.fill(email);
    await passwordInput.fill(TEST_PASSWORD);
    // Confirm React is handling input before submitting the real login form.
    await passwordInput.fill(`${TEST_PASSWORD}x`);
    await passwordInput.fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/portal(?:[/?#]|$)/, { timeout: 45_000 });
    await expect(page.getByText(/bonjour client e2e/i)).toBeVisible({ timeout: 30_000 });
    for (const route of ["/fr/overview", "/fr/onboarding"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/portal(?:[/?#]|$)/);
      await expect(page.getByText(/bonjour client e2e/i)).toBeVisible();
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("customer-portal-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath("customer-portal-mobile.png"), fullPage: true });
    const { data: profile } = await supabaseAdmin.from("profiles")
      .select("onboarding_completed").eq("id", customerUserId).single();
    expect(profile?.onboarding_completed).toBe(false);
  } finally {
    if (customerId) await supabaseAdmin.from("customers").delete().eq("id", customerId);
    if (customerUserId) await cleanupTestUser(customerUserId);
    if (owner) await cleanupTestUser(owner.id);
  }
});
