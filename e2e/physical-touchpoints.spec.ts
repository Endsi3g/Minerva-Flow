import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, cleanupOrphanRestaurants, loginAs, supabaseAdmin, type TestUser } from "./fixtures";

test.describe("Physical touchpoints (NFC/QR attribution)", () => {
  let owner: TestUser;
  let restaurantId: string;
  let customerUserId: string | null = null;

  test.beforeEach(async () => {
    owner = await createTestUser("touchpoint-owner");
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

  test("a tap on a physical touchpoint's /t/[code] link redirects into the real loyalty join flow and attributes the signup", async ({
    page,
    context,
  }) => {
    await loginAs(page, owner);
    await page.goto("/fidelisation/points-de-contact");
    await page.getByRole("button", { name: /nouveau point de contact/i }).click();
    await page.getByPlaceholder("Ex : Comptoir - Caisse").fill("Comptoir - Caisse E2E");
    await page.getByRole("button", { name: /^créer$/i }).click();
    await expect(page.locator("text=/\\/t\\//")).toBeVisible({ timeout: 10000 });

    const { data: touchpoint } = await supabaseAdmin
      .from("physical_touchpoints")
      .select("code")
      .eq("restaurant_id", restaurantId)
      .eq("destination_kind", "loyalty_join")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(touchpoint?.code).toBeTruthy();
    const code = touchpoint!.code as string;

    await context.clearCookies();

    // Tapping the short link should redirect straight into /f/[token] (no
    // intermediate landing page, per the /grill-me decision) with ?tp=
    // attached, and log a touchpoint_opened event.
    await page.goto(`/t/${code}`);
    await expect(page).toHaveURL(new RegExp(`/f/.+\\?tp=${code}`));
    await expect(page.getByText(/programme de fidélité/i)).toBeVisible({ timeout: 10000 });

    await expect(async () => {
      const { data } = await supabaseAdmin
        .from("physical_touchpoint_events")
        .select("event_type")
        .eq("touchpoint_id", (await supabaseAdmin.from("physical_touchpoints").select("id").eq("code", code).single()).data!.id);
      expect(data?.some((e) => e.event_type === "touchpoint_opened")).toBe(true);
    }).toPass({ timeout: 10000 });

    const email = `touchpoint-e2e-${Date.now()}@gmail.com`;
    await page.locator('input[placeholder="Alex Tremblay"]').fill("Client Touchpoint E2E");
    await page.locator('input[type="email"]').fill(email);
    await page.getByRole("button", { name: /rejoindre le programme/i }).click();
    await expect(page.getByText(/vérifiez vos courriels/i)).toBeVisible({ timeout: 10000 });

    const { data: touchpointRow } = await supabaseAdmin.from("physical_touchpoints").select("id").eq("code", code).single();

    // The join is credited back to this exact touchpoint — the core
    // attribution claim ("le chevalet a généré 89 inscriptions").
    await expect(async () => {
      const { data: events } = await supabaseAdmin
        .from("physical_touchpoint_events")
        .select("event_type")
        .eq("touchpoint_id", touchpointRow!.id);
      const types = (events ?? []).map((e) => e.event_type);
      expect(types).toContain("venue_joined");
      expect(types).toContain("loyalty_activated");
    }).toPass({ timeout: 10000 });

    const { data: customer } = await supabaseAdmin.from("customers").select("id, user_id").ilike("email", email).maybeSingle();
    expect(customer).toBeTruthy();
    if (customer?.user_id) customerUserId = customer.user_id as string;
  });

  test("an inactive touchpoint's link does not resolve to its destination", async ({ page, context }) => {
    await loginAs(page, owner);
    await page.goto("/fidelisation/points-de-contact");
    await page.getByRole("button", { name: /nouveau point de contact/i }).click();
    await page.getByPlaceholder("Ex : Comptoir - Caisse").fill("Table désactivée E2E");
    await page.getByRole("button", { name: /^créer$/i }).click();
    await expect(page.locator("text=/\\/t\\//")).toBeVisible({ timeout: 10000 });

    const { data: touchpoint } = await supabaseAdmin
      .from("physical_touchpoints")
      .select("id, code")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const code = touchpoint!.code as string;
    await supabaseAdmin.from("physical_touchpoints").update({ is_active: false }).eq("id", touchpoint!.id);

    await context.clearCookies();
    await page.goto(`/t/${code}`);
    // Falls back to the generic portal rather than the (now-disabled)
    // touchpoint's own destination — same defensive fallback as a tap with
    // no match at all. No customer session in this fresh context, so the
    // portal itself bounces to /portal/login; either is a correct landing,
    // /f/[token] (the disabled touchpoint's real destination) is not.
    await expect(page).toHaveURL(/\/portal(\/login)?$/, { timeout: 10000 });
  });
});
