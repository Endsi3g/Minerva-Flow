import { test, expect } from "@playwright/test";
import { supabaseAdmin } from "./fixtures";

test.describe("Paid catering quote conversion", () => {
  let workspaceId: string | null = null;
  let restaurantId: string | null = null;
  let quoteId: string | null = null;
  let orderId: string | null = null;

  test.beforeEach(async () => {
    const { data: workspace, error: workspaceError } = await supabaseAdmin.from("workspaces")
      .insert({ name: `E2E quote conversion ${Date.now()}` })
      .select("id")
      .single();
    if (workspaceError || !workspace) throw new Error(`Test workspace could not be created: ${workspaceError?.message}`);
    workspaceId = workspace.id;

    const { data: restaurant, error: restaurantError } = await supabaseAdmin.from("restaurants")
      .insert({ name: "E2E quote conversion", workspace_id: workspaceId })
      .select("id")
      .single();
    if (restaurantError || !restaurant) throw new Error(`Test restaurant could not be created: ${restaurantError?.message}`);
    restaurantId = restaurant.id;
  });

  test.afterEach(async () => {
    if (orderId && restaurantId) {
      const { error } = await supabaseAdmin.from("orders").delete().eq("id", orderId).eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test order cleanup failed: ${error.message}`);
    }
    if (quoteId && restaurantId) {
      const { error } = await supabaseAdmin.from("service_quotes").delete().eq("id", quoteId).eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test quote cleanup failed: ${error.message}`);
    }
    if (restaurantId) {
      const { error } = await supabaseAdmin.from("restaurants").delete().eq("id", restaurantId);
      if (error) throw new Error(`Test restaurant cleanup failed: ${error.message}`);
    }
    if (workspaceId) {
      const { error } = await supabaseAdmin.from("workspaces").delete().eq("id", workspaceId);
      if (error) throw new Error(`Test workspace cleanup failed: ${error.message}`);
    }
  });

  test("preserves a delivery address and creates exactly one scheduled production order", async () => {
    if (!restaurantId) throw new Error("Test restaurant was not provisioned.");
    const deliveryAddress = "1250, boulevard Saint-Laurent, Montréal, QC";
    const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const checkoutSessionId = `cs_test_e2e_${nonce}`;
    const paymentIntentId = `pi_test_e2e_${nonce}`;
    const eventAt = new Date(Date.now() + 48 * 60 * 60_000).toISOString();
    const { data: quote, error: quoteError } = await supabaseAdmin.from("service_quotes").insert({
      restaurant_id: restaurantId,
      quote_type: "catering",
      status: "quoted",
      guest_name: "E2E Delivery Guest",
      guest_phone: "+15145550124",
      guest_email: `e2e-quote-${nonce}@example.com`,
      description: "Buffet de test avec livraison.",
      event_at: eventAt,
      guest_count: 12,
      fulfillment_mode: "livraison",
      delivery_address: deliveryAddress,
      currency: "CAD",
      subtotal: 120,
      tax_amount: 17.97,
      total: 137.97,
      deposit_percent: 25,
      deposit_amount: 34.49,
      checkout_session_id: checkoutSessionId,
    }).select("id").single();
    if (quoteError || !quote) throw new Error(`Test quote could not be created: ${quoteError?.message}`);
    quoteId = quote.id;

    const { error: lineError } = await supabaseAdmin.from("service_quote_lines").insert({
      quote_id: quote.id,
      name: "Buffet saisonnier",
      description: "Douze portions",
      quantity: 12,
      unit_price: 10,
      sort_order: 1,
    });
    if (lineError) throw new Error(`Test quote line could not be created: ${lineError.message}`);

    const { data: firstCompletion, error: paymentError } = await supabaseAdmin.rpc("complete_service_quote_payment_once", {
      p_quote_id: quote.id,
      p_checkout_session_id: checkoutSessionId,
      p_payment_intent_id: paymentIntentId,
    });
    const first = Array.isArray(firstCompletion) ? firstCompletion[0] : null;
    if (paymentError || typeof first?.order_id !== "string") {
      throw new Error(`Paid quote conversion failed: ${paymentError?.message ?? "order missing"}`);
    }
    expect(first.created).toBe(true);
    const firstOrderId = first.order_id as string;
    orderId = firstOrderId;

    const { data: order, error: orderError } = await supabaseAdmin.from("orders")
      .select("id, restaurant_id, order_kind, status, fulfillment_mode, delivery_address, requested_ready_at, payment_status, deposit_paid_amount")
      .eq("id", firstOrderId)
      .single();
    expect(orderError).toBeNull();
    expect(order).toMatchObject({
      id: firstOrderId,
      restaurant_id: restaurantId,
      order_kind: "catering",
      status: "confirmee",
      fulfillment_mode: "livraison",
      delivery_address: deliveryAddress,
      payment_status: "en_attente",
      deposit_paid_amount: 34.49,
    });
    expect(Date.parse(order?.requested_ready_at ?? "")).toBe(Date.parse(eventAt));

    const { data: items, error: itemsError } = await supabaseAdmin.from("order_items")
      .select("item_name, unit_price, quantity")
      .eq("order_id", firstOrderId);
    expect(itemsError).toBeNull();
    expect(items).toEqual([{ item_name: "Buffet saisonnier", unit_price: 10, quantity: 12 }]);

    const { data: retryCompletion, error: retryError } = await supabaseAdmin.rpc("complete_service_quote_payment_once", {
      p_quote_id: quote.id,
      p_checkout_session_id: checkoutSessionId,
      p_payment_intent_id: paymentIntentId,
    });
    const retry = Array.isArray(retryCompletion) ? retryCompletion[0] : null;
    expect(retryError).toBeNull();
    expect(retry).toEqual({ order_id: firstOrderId, created: false });

    const { count: matchingOrders, error: countError } = await supabaseAdmin.from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("order_kind", "catering")
      .eq("stripe_payment_intent_id", paymentIntentId);
    expect(countError).toBeNull();
    expect(matchingOrders).toBe(1);
  });
});
