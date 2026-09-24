import { test, expect } from "@playwright/test";
import {
  cleanupOrphanRestaurants,
  cleanupTestUser,
  createTestUser,
  loginAs,
  supabaseAdmin,
  type TestUser,
} from "./fixtures";

test.describe("Public scheduled preorders", () => {
  let user: TestUser;
  let restaurantId = "";
  let menuShareId = "";
  let menuItemId = "";
  let orderId = "";
  let token = "";
  let guestName = "";

  test.beforeEach(async () => {
    user = await createTestUser("public-preorder");
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

    const { error: settingsError } = await supabaseAdmin.from("restaurants")
      .update({ order_modes_enabled: ["sur_place"], delivery_enabled: false, accepts_tips: false, tax_rate: 0 })
      .eq("id", restaurantId);
    if (settingsError) throw new Error(`Test checkout settings could not be configured: ${settingsError.message}`);

    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    token = `e2e-preorder-${nonce}`;
    guestName = `E2E Preorder ${nonce}`;
    const [{ data: share, error: shareError }, { data: item, error: itemError }] = await Promise.all([
      supabaseAdmin.from("menu_shares")
        .insert({ restaurant_id: restaurantId, token, title: "E2E preorder menu", created_by: user.id })
        .select("id")
        .single(),
      supabaseAdmin.from("menu_items")
        .insert({ restaurant_id: restaurantId, name: guestName, category: "E2E", price: 12.5, description: "Synthetic preorder item", active: true })
        .select("id")
        .single(),
    ]);
    if (shareError || !share) throw new Error(`Test menu share could not be created: ${shareError?.message}`);
    if (itemError || !item) throw new Error(`Test menu item could not be created: ${itemError?.message}`);
    menuShareId = share.id;
    menuItemId = item.id;
  });

  test.afterEach(async () => {
    if (orderId && restaurantId) {
      const { error } = await supabaseAdmin.from("orders")
        .delete()
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test order cleanup failed: ${error.message}`);
    }
    if (menuItemId && restaurantId) {
      const { error } = await supabaseAdmin.from("menu_items").delete()
        .eq("id", menuItemId)
        .eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test menu item cleanup failed: ${error.message}`);
    }
    if (menuShareId && restaurantId) {
      const { error } = await supabaseAdmin.from("menu_shares").delete()
        .eq("id", menuShareId)
        .eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test menu share cleanup failed: ${error.message}`);
    }
    if (user?.id) await cleanupTestUser(user.id);
    if (restaurantId) await cleanupOrphanRestaurants([restaurantId]);
  });

  test("adds an item, opens checkout from the cart banner, and persists a scheduled pickup", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await loginAs(page, user);
    await page.goto(`/fr/m/${token}`);

    await page.getByRole("button", { name: `Ajouter ${guestName}`, exact: true }).click();
    await expect(page.getByText(/1 article\s*—/i)).toBeVisible();
    await page.getByRole("button", { name: /voir la commande/i }).click();
    await expect(page.getByRole("dialog", { name: "Votre commande" })).toBeVisible();

    const future = new Date(Date.now() + 48 * 60 * 60_000);
    future.setUTCMinutes(Math.ceil(future.getUTCMinutes() / 15) * 15, 0, 0);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(future);
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "00";
    const requestedReadyAtLocal = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;

    await page.locator('input[name="guestName"]').fill(guestName);
    await page.locator('input[name="requestedReadyAtLocal"]').fill(requestedReadyAtLocal);
    await page.getByRole("button", { name: /envoyer la commande/i }).click();
    await expect(page.getByText("Commande envoyée")).toBeVisible({ timeout: 15_000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("dialog", { name: "Votre commande" })).toBeVisible();
    await page.getByRole("dialog").screenshot({ path: testInfo.outputPath("preorder-success-mobile.png") });
    const viewportWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
    expect(viewportWidth).toBeLessThanOrEqual(390);

    const { data: orders, error: orderError } = await supabaseAdmin.from("orders")
      .select("id, status, guest_name, source, fulfillment_mode, payment_status, requested_ready_at, total")
      .eq("restaurant_id", restaurantId)
      .eq("guest_name", guestName);
    expect(orderError).toBeNull();
    expect(orders).toHaveLength(1);
    const order = orders![0];
    orderId = order.id;
    expect(order).toMatchObject({
      status: "soumise",
      guest_name: guestName,
      source: "web",
      fulfillment_mode: "sur_place",
      payment_status: "non_requis",
      total: 12.5,
    });
    expect(Date.parse(order.requested_ready_at ?? "")).toBeGreaterThan(Date.now() + 12 * 60 * 60_000);

    const { data: lines, error: lineError } = await supabaseAdmin.from("order_items")
      .select("menu_item_id, item_name, unit_price, quantity")
      .eq("order_id", order.id);
    expect(lineError).toBeNull();
    expect(lines).toEqual([{ menu_item_id: menuItemId, item_name: guestName, unit_price: 12.5, quantity: 1 }]);
  });
});
