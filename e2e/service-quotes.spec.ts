import { test, expect } from "@playwright/test";
import { cleanupOrphanRestaurants, cleanupTestUser, createTestUser, supabaseAdmin, type TestUser } from "./fixtures";

test.describe("Public catering and custom-meal quote requests", () => {
  let user: TestUser;
  let restaurantId: string;
  let menuShareId: string;
  let quoteId: string | null = null;
  let guestEmail: string;

  test.beforeEach(async () => {
    user = await createTestUser("service-quote");
    const { data: membership, error: membershipError } = await supabaseAdmin.from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();
    if (membershipError || !membership) throw new Error(`Test restaurant was not provisioned: ${membershipError?.message}`);
    restaurantId = membership.restaurant_id;

    const token = `e2e${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
    const { data: share, error: shareError } = await supabaseAdmin.from("menu_shares")
      .insert({ restaurant_id: restaurantId, token, title: "E2E quote menu", created_by: user.id })
      .select("id")
      .single();
    if (shareError || !share) throw new Error(`Test menu share could not be created: ${shareError?.message}`);
    menuShareId = share.id;
    guestEmail = `e2e-quote-${Date.now()}@example.com`;
  });

  test.afterEach(async () => {
    if (quoteId) {
      await supabaseAdmin.from("service_quotes").delete().eq("id", quoteId).eq("restaurant_id", restaurantId);
    }
    if (menuShareId) await supabaseAdmin.from("menu_shares").delete().eq("id", menuShareId).eq("restaurant_id", restaurantId);
    if (user?.id) await cleanupTestUser(user.id);
    await cleanupOrphanRestaurants();
  });

  test("submits a catering request with a future event time and persists it for the owner", async ({ page }) => {
    const { data: restaurant } = await supabaseAdmin.from("restaurants").select("timezone").eq("id", restaurantId).single();
    const timeZone = restaurant?.timezone ?? "America/Toronto";
    const eventAt = new Date(Date.now() + 48 * 60 * 60_000);
    const dateTimeParts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(eventAt);
    const part = (type: string) => dateTimeParts.find((item) => item.type === type)?.value ?? "00";
    const localEventTime = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
    const { data: share } = await supabaseAdmin.from("menu_shares").select("token").eq("id", menuShareId).single();
    if (!share) throw new Error("Test menu token disappeared.");

    await page.goto(`/m/${share.token}`);
    await page.getByRole("button", { name: /demander un devis sur mesure|request a custom quote/i }).click();
    await expect(page.locator('input[name="guestName"]')).toBeVisible();
    await page.locator('input[name="guestName"]').fill("E2E Catering Guest");
    await page.locator('input[name="guestPhone"]').fill("+15145550123");
    await page.locator('input[name="guestEmail"]').fill(guestEmail);
    await page.locator('input[name="eventAtLocal"]').fill(localEventTime);
    await page.locator('input[name="guestCount"]').fill("18");
    await page.locator('textarea[name="description"]').fill("Buffet pour un événement d’équipe, option végétarienne et allergies aux noix.");
    await page.getByRole("button", { name: /envoyer la demande|send request/i }).click();

    await expect(page.getByText(/demande transmise|request sent/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/n’a pas pu être envoyée|could not send/i)).toHaveCount(0);

    const { data: persistedQuote, error } = await supabaseAdmin.from("service_quotes")
      .select("id, restaurant_id, quote_type, status, guest_count, event_at, customer_id")
      .eq("guest_email", guestEmail)
      .eq("restaurant_id", restaurantId)
      .single();
    expect(error).toBeNull();
    expect(persistedQuote).toMatchObject({
      restaurant_id: restaurantId,
      quote_type: "catering",
      status: "requested",
      guest_count: 18,
      customer_id: null,
    });
    expect(Date.parse(persistedQuote!.event_at)).toBeGreaterThan(Date.now() + 12 * 60 * 60_000);
    quoteId = persistedQuote!.id;
  });
});
