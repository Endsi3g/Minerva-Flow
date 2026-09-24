import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  getClientIp: vi.fn(),
  checkRateLimit: vi.fn(),
  getRestaurantOrderSettings: vi.fn(),
  notifyRestaurant: vi.fn(),
  createOrderPaymentIntent: vi.fn(),
  retrieveOrderPaymentIntent: vi.fn(),
  geocodeAddress: vi.fn(),
  quoteDelivery: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: mocks.getClientIp, checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/data/menu-shares", () => ({ getRestaurantOrderSettings: mocks.getRestaurantOrderSettings }));
vi.mock("@/lib/data/notifications", () => ({ notifyRestaurant: mocks.notifyRestaurant }));
vi.mock("@/lib/stripe/connect", () => ({
  createOrderPaymentIntent: mocks.createOrderPaymentIntent,
  retrieveOrderPaymentIntent: mocks.retrieveOrderPaymentIntent,
}));
vi.mock("@/lib/geocode", () => ({ geocodeAddress: mocks.geocodeAddress }));
vi.mock("@/lib/orders/delivery-pricing", () => ({ quoteDelivery: mocks.quoteDelivery }));

import { submitPublicOrder } from "../customer-referrals";
import { resolveRestaurantLocalDateTime } from "@/lib/orders/scheduling";

const menuItem = { id: "menu-item-1", name: "Soupe du jour", price: 8.25 };
const checkoutKey = "00000000-0000-4000-8000-000000000001";
const restaurant = { timezone: "America/Toronto", city: "Montréal", province: "QC" };
const orderSettings = {
  taxRate: 0.15,
  acceptsTips: true,
  onlinePaymentEnabled: false,
  orderModesEnabled: ["sur_place", "livraison"],
  stripeConnectAccountId: null,
  defaultPrepMinutes: 25,
  delivery: {
    config: {
      enabled: true,
      baseFee: 4.5,
      perKmFee: 1,
      freeKm: 0,
      maxKm: 20,
      averageSpeedKmh: 25,
      perMinuteFee: 0,
    },
    restaurantLat: 45.5,
    restaurantLng: -73.56,
  },
  isBusy: false,
};

type AdminSetup = {
  checkoutError?: { message: string; code?: string } | null;
};

function setupAdmin({ checkoutError = null }: AdminSetup = {}) {
  const writtenOrders: Record<string, unknown>[] = [];
  const writtenItems: Record<string, unknown>[][] = [];
  const orderUpdates: Record<string, unknown>[] = [];
  const checkoutCalls: Record<string, unknown>[] = [];
  let savedOrder: Record<string, unknown> | null = null;

  function lookupQuery(result: { data: unknown; error: unknown }) {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => result),
      single: vi.fn(async () => result),
      in: vi.fn(async () => result),
    };
    return query;
  }

  function updateQuery(row: Record<string, unknown>) {
    const query = {
      eq: vi.fn(() => query),
      neq: vi.fn(() => query),
    };
    if (savedOrder) Object.assign(savedOrder, row);
    return query;
  }
  const orderLookup = (() => {
    const filters = new Map<string, unknown>();
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((field: string, value: unknown) => {
        filters.set(field, value);
        return query;
      }),
      maybeSingle: vi.fn(async () => {
        if (!savedOrder) return { data: null, error: null };
        for (const [field, value] of filters) {
          const savedField = field === "id" ? "id" : field;
          if (savedOrder[savedField] !== value) return { data: null, error: null };
        }
        return { data: savedOrder, error: null };
      }),
    };
    return query;
  })();

  const admin = {
    from: vi.fn((table: string) => {
      if (table === "menu_shares") return lookupQuery({ data: { restaurant_id: "restaurant-1" }, error: null });
      if (table === "menu_items") return lookupQuery({ data: [menuItem], error: null });
      if (table === "customers") return lookupQuery({ data: { id: "customer-1" }, error: null });
      if (table === "restaurants") return lookupQuery({ data: restaurant, error: null });
      if (table === "orders") {
        return {
          select: vi.fn(() => orderLookup),
          update: vi.fn((row: Record<string, unknown>) => {
            orderUpdates.push(row);
            return updateQuery(row);
          }),
        };
      }
      throw new Error(`Unexpected table in public order test: ${table}`);
    }),
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      expect(name).toBe("create_or_get_public_order");
      checkoutCalls.push(args);
      if (checkoutError) return { data: null, error: checkoutError };
      const created = savedOrder === null;
      if (!savedOrder) {
        savedOrder = {
          id: "order-1",
          restaurant_id: args.p_restaurant_id,
          public_checkout_key: args.p_checkout_key,
          public_checkout_user_id: args.p_checkout_user_id,
          public_checkout_fingerprint: args.p_request_fingerprint,
          status: "soumise",
          payment_status: args.p_payment_status,
          stripe_payment_intent_id: null,
          estimated_ready_at: args.p_estimated_ready_at,
          total: args.p_total,
          checkout_stripe_account_id: args.p_stripe_account_id,
        };
        writtenOrders.push({
          status: "soumise",
          payment_status: args.p_payment_status,
          fulfillment_mode: args.p_fulfillment_mode,
          delivery_address: args.p_delivery_address,
          delivery_fee: args.p_delivery_fee,
          delivery_distance_km: args.p_delivery_distance_km,
          delivery_eta_minutes: args.p_delivery_eta_minutes,
          subtotal: args.p_subtotal,
          tax_amount: args.p_tax_amount,
          total: args.p_total,
          requested_ready_at: args.p_requested_ready_at,
        });
        writtenItems.push((args.p_items as Record<string, unknown>[]).map((item) => ({
          order_id: "order-1",
          ...item,
        })));
      }
      return {
        data: [{
          order_id: savedOrder.id,
          created,
          order_status: savedOrder.status,
          payment_status: savedOrder.payment_status,
          stripe_payment_intent_id: savedOrder.stripe_payment_intent_id,
          estimated_ready_at: savedOrder.estimated_ready_at,
          total: savedOrder.total,
          stripe_account_id: savedOrder.checkout_stripe_account_id,
        }],
        error: null,
      };
    }),
  };
  mocks.createAdminClient.mockReturnValue(admin);
  return { writtenOrders, writtenItems, orderUpdates, checkoutCalls };
}

function setupAuthenticatedSession(user: { id: string; email: string } | null) {
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user } })) },
  });
}

function futureRestaurantSlot() {
  const timeZone = "America/Toronto";
  const instant = new Date(Date.now() + 48 * 60 * 60_000);
  instant.setUTCMinutes(Math.ceil(instant.getUTCMinutes() / 15) * 15, 0, 0);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "00";
  const local = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
  return { local, iso: resolveRestaurantLocalDateTime(local, timeZone)?.toISOString() };
}

function setupCommon({ online = false, modes = ["sur_place", "livraison"] } = {}) {
  setupAuthenticatedSession({ id: "user-1", email: "client@example.com" });
  mocks.getClientIp.mockResolvedValue("198.18.0.1");
  mocks.checkRateLimit.mockResolvedValue({ allowed: true });
  mocks.getRestaurantOrderSettings.mockResolvedValue({
    ...orderSettings,
    onlinePaymentEnabled: online,
    orderModesEnabled: modes,
    stripeConnectAccountId: online ? "acct_test_restaurant" : null,
  });
  mocks.notifyRestaurant.mockResolvedValue(undefined);
  mocks.geocodeAddress.mockResolvedValue({ lat: 45.52, lng: -73.58 });
  mocks.quoteDelivery.mockReturnValue({
    available: true,
    fee: 4.5,
    distanceKm: 3.2,
    etaMinutes: 28,
  });
  mocks.createOrderPaymentIntent.mockResolvedValue({ id: "pi_test_1", clientSecret: "pi_secret_test_1", status: "requires_payment_method" });
  mocks.retrieveOrderPaymentIntent.mockResolvedValue({ id: "pi_test_1", clientSecret: "pi_secret_test_1", status: "requires_payment_method" });
}

describe("submitPublicOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCommon();
  });

  it("rejects direct unauthenticated submissions before creating a customer or order", async () => {
    setupAuthenticatedSession(null);
    const result = await submitPublicOrder("menu-token", null, [{ menuItemId: menuItem.id, quantity: 1 }], {
      guestName: "Visiteur",
      guestPhone: null,
      paymentMethod: "Carte",
      tipAmount: 0,
      fulfillmentMode: "sur_place",
      payOnline: false,
      marketingConsent: false,
    }, checkoutKey);

    expect(result).toEqual({ ok: false });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("persists a scheduled pickup using server menu prices, not client-supplied amounts", async () => {
    const { writtenOrders, writtenItems } = setupAdmin();
    const cart = [{ menuItemId: menuItem.id, quantity: 2, price: 0.01 }] as unknown as { menuItemId: string; quantity: number }[];
    const schedule = futureRestaurantSlot();

    const result = await submitPublicOrder("menu-token", null, cart, {
      guestName: "Camille Martin",
      guestPhone: "+15145550129",
      paymentMethod: "Comptant",
      tipAmount: 0,
      fulfillmentMode: "sur_place",
      payOnline: false,
      requestedReadyAtLocal: schedule.local,
      marketingConsent: false,
    }, checkoutKey);

    expect(result).toMatchObject({ ok: true, orderId: "order-1", clientSecret: null });
    expect(writtenOrders[0]).toMatchObject({
      status: "soumise",
      payment_status: "non_requis",
      fulfillment_mode: "sur_place",
      subtotal: 16.5,
      tax_amount: 2.48,
      total: 18.98,
      requested_ready_at: schedule.iso,
    });
    expect(writtenItems[0]).toEqual([{
      order_id: "order-1",
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      unit_price: menuItem.price,
      quantity: 2,
    }]);
  });

  it("rejects a delivery order when the restaurant has disabled delivery", async () => {
    const { writtenOrders } = setupAdmin();
    mocks.getRestaurantOrderSettings.mockResolvedValue({
      ...orderSettings,
      orderModesEnabled: ["sur_place"],
      delivery: { ...orderSettings.delivery, config: { ...orderSettings.delivery.config, enabled: false } },
    });

    const result = await submitPublicOrder("menu-token", null, [{ menuItemId: menuItem.id, quantity: 1 }], {
      guestName: "Camille Martin",
      guestPhone: null,
      paymentMethod: null,
      tipAmount: 0,
      fulfillmentMode: "livraison",
      payOnline: false,
      deliveryAddress: "1250 boulevard Saint-Laurent, Montréal, QC",
      marketingConsent: false,
    }, checkoutKey);

    expect(result).toEqual({ ok: false });
    expect(writtenOrders).toHaveLength(0);
    expect(mocks.geocodeAddress).not.toHaveBeenCalled();
    expect(mocks.createOrderPaymentIntent).not.toHaveBeenCalled();
  });

  it("uses the server delivery quote in the online payment intent and order total", async () => {
    const { writtenOrders, writtenItems } = setupAdmin();
    setupCommon({ online: true });
    const schedule = futureRestaurantSlot();
    const result = await submitPublicOrder("menu-token", null, [{ menuItemId: menuItem.id, quantity: 2 }], {
      guestName: "Camille Martin",
      guestPhone: "+15145550129",
      paymentMethod: null,
      tipAmount: 0,
      fulfillmentMode: "livraison",
      payOnline: true,
      deliveryAddress: "  1250 boulevard Saint-Laurent, Montréal, QC  ",
      requestedReadyAtLocal: schedule.local,
      marketingConsent: false,
    }, checkoutKey);

    expect(result).toMatchObject({ ok: true, orderId: "order-1", clientSecret: "pi_secret_test_1" });
    expect(writtenOrders[0]).toMatchObject({
      payment_status: "en_attente",
      fulfillment_mode: "livraison",
      delivery_address: "1250 boulevard Saint-Laurent, Montréal, QC",
      delivery_fee: 4.5,
      delivery_distance_km: 3.2,
      delivery_eta_minutes: 28,
      subtotal: 16.5,
      tax_amount: 2.48,
      total: 23.48,
      requested_ready_at: schedule.iso,
    });
    expect(mocks.createOrderPaymentIntent).toHaveBeenCalledWith({
      orderId: "order-1",
      restaurantId: "restaurant-1",
      connectedAccountId: "acct_test_restaurant",
      amountCents: 2348,
    });
    expect(result).toMatchObject({ total: 23.48 });
    expect(writtenItems[0][0]).toMatchObject({ unit_price: 8.25, quantity: 2 });
  });

  it("keeps the same order retryable if Stripe is temporarily unavailable", async () => {
    const { orderUpdates } = setupAdmin();
    setupCommon({ online: true });
    mocks.createOrderPaymentIntent.mockRejectedValue(new Error("Stripe test connection unavailable"));

    const result = await submitPublicOrder("menu-token", null, [{ menuItemId: menuItem.id, quantity: 1 }], {
      guestName: "Camille Martin",
      guestPhone: null,
      paymentMethod: null,
      tipAmount: 0,
      fulfillmentMode: "sur_place",
      payOnline: true,
      marketingConsent: false,
    }, checkoutKey);

    expect(result).toEqual({ ok: false });
    expect(orderUpdates).toContainEqual({ payment_status: "echoue" });
  });

  it("reuses the same order and PaymentIntent after the first response is lost", async () => {
    const { writtenOrders, writtenItems } = setupAdmin();
    setupCommon({ online: true });
    const cart = [{ menuItemId: menuItem.id, quantity: 1 }];
    const guestInfo = {
      guestName: "Camille Martin",
      guestPhone: null,
      paymentMethod: null,
      tipAmount: 0,
      fulfillmentMode: "sur_place" as const,
      payOnline: true,
      marketingConsent: false,
    };

    const first = await submitPublicOrder("menu-token", null, cart, guestInfo, checkoutKey);
    const retry = await submitPublicOrder("menu-token", null, cart, guestInfo, checkoutKey);

    expect(first).toMatchObject({ ok: true, orderId: "order-1", clientSecret: "pi_secret_test_1" });
    expect(retry).toEqual(first);
    expect(writtenOrders).toHaveLength(1);
    expect(writtenItems).toHaveLength(1);
    expect(mocks.notifyRestaurant).toHaveBeenCalledTimes(1);
    expect(mocks.createOrderPaymentIntent).toHaveBeenCalledTimes(1);
    expect(mocks.retrieveOrderPaymentIntent).toHaveBeenCalledWith({
      orderId: "order-1",
      restaurantId: "restaurant-1",
      paymentIntentId: "pi_test_1",
    });
  });

  it("rejects reuse of a key for a changed cart instead of creating a second order", async () => {
    const { writtenOrders, checkoutCalls } = setupAdmin();
    setupCommon({ online: true });
    const info = {
      guestName: "Camille Martin",
      guestPhone: null,
      paymentMethod: null,
      tipAmount: 0,
      fulfillmentMode: "sur_place" as const,
      payOnline: true,
      marketingConsent: false,
    };

    await submitPublicOrder("menu-token", null, [{ menuItemId: menuItem.id, quantity: 1 }], info, checkoutKey);
    const changed = await submitPublicOrder("menu-token", null, [{ menuItemId: menuItem.id, quantity: 2 }], info, checkoutKey);

    expect(changed).toEqual({ ok: false });
    expect(writtenOrders).toHaveLength(1);
    expect(checkoutCalls).toHaveLength(1);
    expect(mocks.createOrderPaymentIntent).toHaveBeenCalledTimes(1);
  });

  it("keeps an order successful if the restaurant notification fails after persistence", async () => {
    setupAdmin();
    mocks.notifyRestaurant.mockRejectedValue(new Error("Notification provider unavailable"));

    const result = await submitPublicOrder("menu-token", null, [{ menuItemId: menuItem.id, quantity: 1 }], {
      guestName: "Camille Martin",
      guestPhone: null,
      paymentMethod: "Comptant",
      tipAmount: 0,
      fulfillmentMode: "sur_place",
      payOnline: false,
      marketingConsent: false,
    }, checkoutKey);

    expect(result).toMatchObject({ ok: true, orderId: "order-1", clientSecret: null });
  });

  it("does not start payment when atomic order and line-item persistence fails", async () => {
    setupAdmin({ checkoutError: { message: "atomic checkout failed", code: "XX000" } });

    const result = await submitPublicOrder("menu-token", null, [{ menuItemId: menuItem.id, quantity: 1 }], {
      guestName: "Camille Martin",
      guestPhone: null,
      paymentMethod: "Comptant",
      tipAmount: 0,
      fulfillmentMode: "sur_place",
      payOnline: false,
      marketingConsent: false,
    }, checkoutKey);

    expect(result).toEqual({ ok: false });
    expect(mocks.notifyRestaurant).not.toHaveBeenCalled();
    expect(mocks.createOrderPaymentIntent).not.toHaveBeenCalled();
  });
});
