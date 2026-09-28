import { test, expect } from "@playwright/test";
import {
  cleanupOrphanRestaurants,
  cleanupTestUser,
  createTestUser,
  loginAs,
  supabaseAdmin,
  type TestUser,
} from "./fixtures";

test.describe("Catering production lifecycle", () => {
  let user: TestUser;
  let restaurantId = "";
  let orderId = "";
  let quoteId = "";
  let guestName = "";

  test.beforeEach(async () => {
    user = await createTestUser("quote-production");
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();
    if (membershipError || !membership) {
      throw new Error(`Test restaurant was not provisioned: ${membershipError?.message}`);
    }
    restaurantId = membership.restaurant_id;

    // Keep the event on the restaurant's current local day so it appears in
    // the production calendar as soon as the owner opens Commandes.
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("id", restaurantId)
      .single();
    if (restaurantError || !restaurant) {
      throw new Error(`Test restaurant settings could not be loaded: ${restaurantError?.message}`);
    }
    const now = new Date();
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    guestName = `E2E Production ${nonce}`;

    const { data: order, error: orderError } = await supabaseAdmin.from("orders").insert({
      restaurant_id: restaurantId,
      status: "confirmee",
      guest_name: guestName,
      subtotal: 120,
      tax_amount: 17.97,
      total: 137.97,
      order_kind: "catering",
      fulfillment_mode: "sur_place",
      requested_ready_at: now.toISOString(),
      // Catering deposits are partial payments: they remain `en_attente`
      // until the balance is paid. The production gate permits preparation
      // once any valid deposit has actually been received.
      payment_status: "en_attente",
      deposit_paid_amount: 34.49,
    }).select("id").single();
    if (orderError || !order) throw new Error(`Test production order could not be created: ${orderError?.message}`);
    orderId = order.id;

    const { data: quote, error: quoteError } = await supabaseAdmin.from("service_quotes").insert({
      restaurant_id: restaurantId,
      quote_type: "catering",
      status: "converted",
      guest_name: guestName,
      guest_phone: "+15145550123",
      guest_email: user.email,
      description: "Buffet synthétique de vérification du cycle de production.",
      event_at: now.toISOString(),
      guest_count: 12,
      fulfillment_mode: "sur_place",
      currency: "CAD",
      subtotal: 120,
      tax_amount: 17.97,
      total: 137.97,
      deposit_percent: 25,
      deposit_amount: 34.49,
      converted_order_id: orderId,
    }).select("id").single();
    if (quoteError || !quote) throw new Error(`Test catering quote could not be created: ${quoteError?.message}`);
    quoteId = quote.id;
  });

  test.afterEach(async () => {
    if (quoteId && restaurantId) {
      const { error } = await supabaseAdmin.from("service_quotes").delete()
        .eq("id", quoteId).eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test quote cleanup failed: ${error.message}`);
    }
    if (orderId && restaurantId) {
      const { error } = await supabaseAdmin.from("orders").delete()
        .eq("id", orderId).eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test order cleanup failed: ${error.message}`);
    }
    if (user?.id) await cleanupTestUser(user.id);
    if (restaurantId) await cleanupOrphanRestaurants([restaurantId]);
  });

  test("owner advances a catering order with a paid deposit from confirmed to preparing to ready", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await loginAs(page, user);
    await page.goto("/fr/commandes");

    const calendar = page.getByRole("region", { name: "Calendrier de production traiteur" });
    await expect(calendar).toBeVisible({ timeout: 30_000 });
    await expect(calendar.getByText(guestName, { exact: true })).toBeVisible();
    await expect(calendar.getByRole("button", { name: "Démarrer" })).toBeVisible();
    await calendar.screenshot({ path: testInfo.outputPath("catering-production-confirmed-desktop.png") });

    await calendar.getByRole("button", { name: "Démarrer" }).click();
    await expect(calendar.getByText("En préparation")).toBeVisible();
    await expect(calendar.getByRole("button", { name: "Marquer prête" })).toBeVisible();
    const { data: preparingOrder, error: preparingError } = await supabaseAdmin.from("orders")
      .select("status, payment_status")
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId)
      .single();
    expect(preparingError).toBeNull();
    expect(preparingOrder).toEqual({ status: "en_preparation", payment_status: "en_attente" });
    await expect(calendar.getByText(/Solde à payer/)).toBeVisible();
    await expect(page.getByText("Production démarrée.")).toBeHidden({ timeout: 6_000 });

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await calendar.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(calendar.getByRole("button", { name: "Aujourd’hui" })).toBeVisible();
    await calendar.screenshot({ path: testInfo.outputPath("catering-production-preparing-mobile.png") });
    await page.screenshot({ path: testInfo.outputPath("catering-production-page-mobile.png"), fullPage: true });
    expect(await page.locator("body").evaluate((body) => body.scrollWidth)).toBeLessThanOrEqual(390);

    await calendar.getByRole("button", { name: "Marquer prête" }).click();
    await expect(calendar.getByText("Prête")).toBeVisible();
    await expect(calendar.getByRole("button", { name: "Terminer" })).toBeVisible();
    const { data: readyOrder, error: readyError } = await supabaseAdmin.from("orders")
      .select("status, payment_status")
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId)
      .single();
    expect(readyError).toBeNull();
    expect(readyOrder).toEqual({ status: "prete", payment_status: "en_attente" });
  });
});
