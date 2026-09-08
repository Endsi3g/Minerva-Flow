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
  let owner: TestUser;
  let restaurantId: string;
  let customerUserId: string | null = null;

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
    if (customerUserId) await cleanupTestUser(customerUserId).catch(() => {});
    await cleanupTestUser(owner.id);
    await cleanupOrphanRestaurants();
  });

  test("a stranger can join the loyalty program from a public link and see their points in the portal", async ({ page, context }) => {
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

    await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=magiclink&next=%2Fportal`);
    await expect(page).toHaveURL(/\/portal$/, { timeout: 10000 });
    await expect(page.getByText(/bonjour client e2e/i)).toBeVisible({ timeout: 10000 });

    const { data: customer } = await supabaseAdmin.from("customers").select("id, user_id").ilike("email", email).maybeSingle();
    expect(customer?.user_id).toBeTruthy();
    customerUserId = customer!.user_id as string;
  });
});
