import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, loginAs, supabaseAdmin, type TestUser } from "./fixtures";
import { nfcCardPurchaseConfiguredForTests, deliverWebhookEvent, buildNfcCardOrderCheckoutCompletedEvent } from "./stripe-helpers";

test.describe("NFC card orders ($75 CAD one-time add-on)", () => {
  let owner: TestUser;
  let restaurantId: string;

  test.beforeEach(async () => {
    owner = await createTestUser("nfc-card-owner");
    const { data: membership } = await supabaseAdmin
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", owner.id)
      .eq("role", "owner")
      .maybeSingle();
    restaurantId = membership!.restaurant_id as string;
  });

  test.afterEach(async () => {
    await supabaseAdmin.from("nfc_card_orders").delete().eq("restaurant_id", restaurantId);
    await cleanupTestUser(owner.id);
  });

  test("the purchase panel stays hidden while Stripe/the NFC card price isn't configured", async ({ page }) => {
    test.skip(nfcCardPurchaseConfiguredForTests(), "This asserts the dormant state — skip once Stripe is actually wired up.");
    await loginAs(page, owner);
    await page.goto("/fidelisation/points-de-contact");
    await expect(page.getByRole("heading", { name: "Points de contact" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Cartes NFC personnalisées")).not.toBeVisible();
  });

  test("checkout.session.completed for an nfc_card_order creates a paid order and notifies the restaurant", async ({ baseURL }) => {
    test.skip(!nfcCardPurchaseConfiguredForTests(), "Stripe/NFC card price not configured for this run — see .env.local");

    const res = await deliverWebhookEvent(
      baseURL!,
      buildNfcCardOrderCheckoutCompletedEvent({
        restaurantId,
        quantity: 3,
        amountTotalCents: 3 * 75 * 100,
        shippingName: "Café Test E2E",
      })
    );
    expect(res.ok).toBe(true);

    const { data: order } = await supabaseAdmin
      .from("nfc_card_orders")
      .select("quantity, unit_price_cad, total_amount_cad, status, shipping_name")
      .eq("restaurant_id", restaurantId)
      .single();
    expect(order?.quantity).toBe(3);
    expect(order?.unit_price_cad).toBe(75);
    expect(order?.total_amount_cad).toBe(225);
    expect(order?.status).toBe("paid");
    expect(order?.shipping_name).toBe("Café Test E2E");

    const { data: notification } = await supabaseAdmin
      .from("notifications")
      .select("type")
      .eq("restaurant_id", restaurantId)
      .eq("type", "nfc_card_order.paid")
      .maybeSingle();
    expect(notification).toBeTruthy();
  });
});
