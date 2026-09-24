import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCustomer, mapReward, type CustomerRow, mapTransaction, type LoyaltyTransactionRow } from "@/lib/data/customers";
import { mapReferralProgram, type ReferralProgramRow } from "@/lib/data/referral-programs";
import { mapLink, type CustomerReferralLinkRow } from "@/lib/data/customer-referrals";
import { getRestaurantOrderSettings } from "@/lib/data/menu-shares";
import { computeOrderPricing } from "@/lib/data/order-pricing";
import { quoteDelivery } from "@/lib/orders/delivery-pricing";
import type { DeliveryQuote } from "@/lib/orders/delivery-pricing";
import { geocodeAddress } from "@/lib/geocode";
import { notifyRestaurant } from "@/lib/data/notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { formatCurrency } from "@/lib/utils";
import { computeEstimatedReadyAt } from "@/lib/orders/eta";
import { validateRequestedReadyAt } from "@/lib/orders/scheduling";
import { getPublicCheckoutOptions } from "@/lib/orders/checkout-options";
import { createPortalOrderCheckoutSession, retrievePortalOrderCheckoutSession } from "@/lib/stripe/connect";
import { resolvePortalOrderCheckoutAction } from "@/lib/stripe/checkout-status";
import type Stripe from "stripe";
import type {
  Customer,
  CustomerReferralLink,
  LoyaltyReward,
  LoyaltyTransaction,
  OrderSource,
  ReferralProgram,
  RewardRedemption,
} from "@/lib/types";

/**
 * Every customer record for the currently authenticated portal user — uses
 * the session client (not admin) so the customers_select_own RLS policy
 * (auth.uid() = user_id) is the actual source of truth for "is this really
 * their own record", not just an application-level assumption. Returns
 * every restaurant relationship rather than picking one: the same email
 * can be a loyalty customer at more than one participating restaurant, and
 * silently showing an arbitrary one would leak the wrong restaurant's data
 * into view. Callers decide what to do with more than one (see
 * app/portal/page.tsx for the chooser).
 */
export async function getCustomersForUser(userId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as CustomerRow[]).map((row) => mapCustomer(row, []));
}

export type PortalReferralProgress = {
  program: ReferralProgram;
  link: CustomerReferralLink | null;
};

export type PortalData = {
  transactions: LoyaltyTransaction[];
  programs: PortalReferralProgress[];
  rewards: LoyaltyReward[];
  redemptions: RewardRedemption[];
};

type RewardRedemptionRow = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  reward_id: string;
  reward_name: string;
  points_spent: number;
  code: string;
  status: "pending" | "claimed";
  created_at: string;
  claimed_at: string | null;
};

function mapRedemption(row: RewardRedemptionRow): RewardRedemption {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    customerId: row.customer_id,
    rewardId: row.reward_id,
    rewardName: row.reward_name,
    pointsSpent: row.points_spent,
    code: row.code,
    status: row.status,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
  };
}

/**
 * Aggregates everything the portal dashboard shows. Runs entirely
 * server-side after getCustomerForUser has already verified (via RLS) that
 * the caller owns this customer record, so the admin client here is just a
 * convenience for the cross-restaurant-program joins, not a trust boundary.
 */
export async function getPortalData(customer: Customer): Promise<PortalData> {
  const admin = createAdminClient();

  const [{ data: txData }, { data: programRows }, { data: rewardRows }, { data: redemptionRows }] = await Promise.all([
    admin
      .from("loyalty_transactions")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
    admin.from("referral_programs").select("*").eq("restaurant_id", customer.restaurantId).eq("active", true),
    admin
      .from("loyalty_rewards")
      .select("*")
      .eq("restaurant_id", customer.restaurantId)
      .eq("active", true)
      .order("points_cost"),
    admin
      .from("reward_redemptions")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
  ]);

  const transactions = ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction);
  const programs = ((programRows as ReferralProgramRow[]) ?? []).map(mapReferralProgram);
  const rewards = ((rewardRows as Parameters<typeof mapReward>[0][]) ?? []).map(mapReward);
  const redemptions = ((redemptionRows as RewardRedemptionRow[]) ?? []).map(mapRedemption);

  let links: CustomerReferralLink[] = [];
  if (programs.length > 0) {
    const { data: linkRows } = await admin
      .from("customer_referral_links")
      .select("*")
      .eq("customer_id", customer.id)
      .in(
        "referral_program_id",
        programs.map((p) => p.id)
      );
    links = ((linkRows as CustomerReferralLinkRow[]) ?? []).map(mapLink);
  }

  return {
    transactions,
    programs: programs.map((program) => ({
      program,
      link: links.find((l) => l.referralProgramId === program.id) ?? null,
    })),
    rewards,
    redemptions,
  };
}

/**
 * Self-serve data export (Loi 25 — right to portability/access). Until
 * this existed, the privacy policy's promise of a portability right
 * (app/[locale]/legal/privacy/page.tsx §5) had no actual self-serve path —
 * a customer had to email privacy@ and wait on a human. Returns only this
 * one customer relationship's own data (their profile fields plus their
 * own transactions, redemptions, and referral links), never the
 * restaurant's catalog data (rewards/offers are the restaurant's
 * configuration, not the customer's personal data) and never other
 * customers' data. `customer` is trusted by the caller having already
 * verified (via RLS or a verified Bearer token) that it belongs to the
 * authenticated user — same precondition getPortalData already relies on.
 */
export async function exportCustomerData(customer: Customer): Promise<Record<string, unknown>> {
  const portalData = await getPortalData(customer);
  return {
    exportedAt: new Date().toISOString(),
    profile: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      birthday: customer.birthday,
      city: customer.city,
      neighborhood: customer.neighborhood,
      marketingConsent: customer.marketingConsent,
      consentSource: customer.consentSource,
      consentAt: customer.consentAt,
      visitCount: customer.visitCount,
      totalSpent: customer.totalSpent,
      loyaltyPoints: customer.loyaltyPoints,
      memberSince: customer.createdAt,
    },
    transactions: portalData.transactions,
    redemptions: portalData.redemptions,
    referralLinks: portalData.programs
      .filter((p) => p.link)
      .map((p) => ({ program: p.program.name, code: p.link!.code, convertedCount: p.link!.convertedCount })),
  };
}

/**
 * Self-serve redemption: the currently authenticated portal user spends
 * their own points for a reward via the self_redeem_reward RPC (which
 * resolves auth.uid() to their own customers row internally — no
 * customer id is ever taken from the client). Uses the session client,
 * not admin, since the RPC's own auth checks ARE the trust boundary here.
 */
export async function selfRedeemReward(rewardId: string): Promise<RewardRedemption | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("self_redeem_reward", { p_reward_id: rewardId });
  if (error || !data) return null;
  const redemption = mapRedemption(data as RewardRedemptionRow);

  try {
    const { recordLifecycleEvent } = await import("@/lib/data/lifecycle-events");
    await recordLifecycleEvent(
      {
        restaurantId: redemption.restaurantId,
        customerId: redemption.customerId,
        eventType: "reward_redeemed",
        metadata: {
          redemptionId: redemption.id,
          rewardId: redemption.rewardId,
          rewardName: redemption.rewardName,
          pointsSpent: redemption.pointsSpent,
          code: redemption.code,
          source: "customer_portal_self_redeem",
        },
      },
      supabase
    );
  } catch {
    // Non-blocking
  }

  return redemption;
}

/**
 * Self-serve account deletion, callable from both the web portal (session
 * cookie, see actions.ts) and the native app (Bearer token, see
 * app/api/portal/account/route.ts) — userId is always the caller's own
 * auth.uid(), verified by each entry point before this runs, never taken
 * from client-supplied data.
 *
 * A hard `auth.admin.deleteUser` is the actual point of no return (profiles
 * cascades via its own FK, see 0001_init.sql). The customers rows are
 * anonymized rather than deleted outright first: a restaurant's own
 * visit/spend/redemption history is that restaurant's business record, not
 * something a customer erasing their *login* should be able to corrupt —
 * but the personally-identifying fields (name, email, birthday, city,
 * marketing consent, the user_id link itself) are wiped, so nothing here
 * still identifies the person once their account is gone.
 */
export async function deleteMyAccount(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { error: anonymizeError } = await admin
    .from("customers")
    .update({
      user_id: null,
      name: "Compte supprimé",
      email: null,
      birthday: null,
      city: null,
      marketing_consent: false,
      favorite_offer_ids: [],
      favorite_menu_item_ids: [],
    })
    .eq("user_id", userId);
  if (anonymizeError) return false;

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  return !deleteError;
}

export type PortalOrderCartLine = {
  menuItemId: string;
  quantity: number;
};

export async function getPortalDeliveryQuote(customer: Customer, address: string): Promise<DeliveryQuote> {
  const normalizedAddress = address.trim();
  if (!normalizedAddress || normalizedAddress.length > 240) {
    return { available: false, fee: 0, distanceKm: null, etaMinutes: null, reason: "missing_location" };
  }
  const admin = createAdminClient();
  const [settings, restaurantResult] = await Promise.all([
    getRestaurantOrderSettings(admin, customer.restaurantId),
    admin.from("restaurants").select("address, city, province").eq("id", customer.restaurantId).maybeSingle(),
  ]);
  if (!settings) return { available: false, fee: 0, distanceKm: null, etaMinutes: null, reason: "disabled" };
  const restaurant = restaurantResult.data as { address?: string | null; city?: string | null; province?: string | null } | null;
  const destination = await geocodeAddress(normalizedAddress, restaurant?.city ?? "", restaurant?.province ?? undefined);
  const quote = quoteDelivery(
    settings.delivery.config,
    { lat: settings.delivery.restaurantLat, lng: settings.delivery.restaurantLng },
    destination ? { lat: destination.lat, lng: destination.lng } : null
  );
  return quote.reason === "missing_location" ? { ...quote, available: false } : quote;
}

export type SubmitPortalOrderResult =
  | { ok: false }
  | { ok: true; orderId: string; estimatedReadyAt: string | null; paymentUrl: string | null; paymentConfirmed?: boolean };

type PortalCheckoutRow = {
  order_id: string;
  created: boolean;
  order_status: string;
  payment_status: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  estimated_ready_at: string | null;
  total: number;
  stripe_account_id: string | null;
};

function portalOrderFingerprint(input: {
  customer: Customer;
  cart: PortalOrderCartLine[];
  tipAmount: number;
  paymentMethod: string | null;
  source: OrderSource;
  delivery?: { address: string };
  requestedReadyAtLocal?: string | null;
  payOnline: boolean;
}): string {
  const canonical = {
    restaurantId: input.customer.restaurantId,
    customerId: input.customer.id,
    userId: input.customer.userId,
    source: input.source,
    cart: input.cart.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity }))
      .sort((a, b) => a.menuItemId.localeCompare(b.menuItemId)),
    tipAmount: Math.round(input.tipAmount * 100) / 100,
    paymentMethod: input.paymentMethod?.trim() || null,
    deliveryAddress: input.delivery?.address.trim() || null,
    requestedReadyAtLocal: input.requestedReadyAtLocal?.trim() || null,
    payOnline: input.payOnline,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

async function completePortalOrderCheckout(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    orderId: string;
    restaurantId: string;
    status: string;
    paymentStatus: string;
    estimatedReadyAt: string | null;
    total: number;
    stripeAccountId: string | null;
    stripeCheckoutSessionId: string | null;
    restaurantName: string;
    customerEmail: string | null;
  }
): Promise<SubmitPortalOrderResult> {
  if (input.status === "annulee") return { ok: false };
  if (input.paymentStatus === "non_requis") {
    return { ok: true, orderId: input.orderId, estimatedReadyAt: input.estimatedReadyAt, paymentUrl: null };
  }
  if (input.paymentStatus === "paye") {
    return { ok: true, orderId: input.orderId, estimatedReadyAt: input.estimatedReadyAt, paymentUrl: null, paymentConfirmed: true };
  }
  if (!input.stripeAccountId) return { ok: false };

  try {
    let checkout: {
      id: string;
      url: string | null;
      paymentStatus?: Stripe.Checkout.Session.PaymentStatus;
      status?: Stripe.Checkout.Session.Status | null;
    };
    if (input.stripeCheckoutSessionId) {
      const existingCheckout = await retrievePortalOrderCheckoutSession({
          orderId: input.orderId,
          restaurantId: input.restaurantId,
          checkoutSessionId: input.stripeCheckoutSessionId,
      });
      const action = resolvePortalOrderCheckoutAction(existingCheckout);
      if (action === "paid") {
        return { ok: true, orderId: input.orderId, estimatedReadyAt: input.estimatedReadyAt, paymentUrl: null, paymentConfirmed: true };
      }
      if (action === "blocked") return { ok: false };
      checkout = action === "retry"
        ? await createPortalOrderCheckoutSession({
            orderId: input.orderId,
            retryOfSessionId: existingCheckout.id,
            restaurantId: input.restaurantId,
            connectedAccountId: input.stripeAccountId,
            amountCents: Math.round(Number(input.total) * 100),
            restaurantName: input.restaurantName,
            customerEmail: input.customerEmail,
          })
        : existingCheckout;
    } else {
      checkout = await createPortalOrderCheckoutSession({
          orderId: input.orderId,
          restaurantId: input.restaurantId,
          connectedAccountId: input.stripeAccountId,
          amountCents: Math.round(Number(input.total) * 100),
          restaurantName: input.restaurantName,
          customerEmail: input.customerEmail,
      });
    }
    if (!checkout.url) return { ok: false };
    const { error } = await admin.from("orders")
      .update({ stripe_checkout_session_id: checkout.id, payment_status: "en_attente" })
      .eq("id", input.orderId)
      .eq("restaurant_id", input.restaurantId);
    if (error) throw error;
    return { ok: true, orderId: input.orderId, estimatedReadyAt: input.estimatedReadyAt, paymentUrl: checkout.url };
  } catch (error) {
    console.error("submitPortalOrder: Stripe retry unavailable", {
      orderId: input.orderId,
      message: error instanceof Error ? error.message : "unknown_error",
    });
    await admin.from("orders")
      .update({ payment_status: "echoue" })
      .eq("id", input.orderId)
      .eq("restaurant_id", input.restaurantId)
      .neq("payment_status", "paye");
    return { ok: false };
  }
}

/**
 * Ordering from an already-authenticated portal customer — the order lands
 * directly in the restaurant's own /commandes queue as 'soumise', and can
 * optionally use hosted Stripe Checkout. `customer` is trusted here — the caller
 * (submitPortalOrderAction) has already confirmed the id belongs to the
 * authenticated session, same pattern as updateMyProfileAction.
 */
export async function submitPortalOrder(
  customer: Customer,
  cart: PortalOrderCartLine[],
  tipAmount: number,
  paymentMethod: string | null,
  idempotencyKey: string,
  source: OrderSource = "web",
  delivery?: { address: string },
  requestedReadyAtLocal?: string | null,
  payOnline = false
): Promise<SubmitPortalOrderResult> {
  if (!Array.isArray(cart) || cart.length === 0 || cart.length > 100
      || cart.some((line) => !line || typeof line.menuItemId !== "string" || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)
      || !customer.userId
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) return { ok: false };

  // Same reasoning as submitPublicOrder — a scripted client calling this
  // action directly could otherwise create unlimited real orders.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`order-submit:${ip}`, { max: 10, windowSeconds: 300 });
  if (!allowed) return { ok: false };

  const admin = createAdminClient();
  const fingerprint = portalOrderFingerprint({
    customer, cart, tipAmount, paymentMethod, source, delivery, requestedReadyAtLocal, payOnline,
  });
  const { data: existingOrder, error: existingLookupError } = await admin.from("orders")
    .select("id, public_checkout_user_id, public_checkout_fingerprint, status, payment_status, stripe_payment_intent_id, stripe_checkout_session_id, estimated_ready_at, total, checkout_stripe_account_id")
    .eq("restaurant_id", customer.restaurantId)
    .eq("public_checkout_key", idempotencyKey)
    .maybeSingle();
  if (existingLookupError) {
    console.error("submitPortalOrder: idempotency lookup unavailable", existingLookupError.code ?? "unknown");
    return { ok: false };
  }
  if (existingOrder) {
    const existing = existingOrder as {
      id: string;
      public_checkout_user_id: string | null;
      public_checkout_fingerprint: string | null;
      status: string;
      payment_status: string;
      stripe_checkout_session_id: string | null;
      estimated_ready_at: string | null;
      total: number;
      checkout_stripe_account_id: string | null;
    };
    if (existing.public_checkout_user_id !== customer.userId || existing.public_checkout_fingerprint !== fingerprint) {
      return { ok: false };
    }
    const { data: restaurantRow } = await admin.from("restaurants").select("name")
      .eq("id", customer.restaurantId).maybeSingle();
    return completePortalOrderCheckout(admin, {
      orderId: existing.id,
      restaurantId: customer.restaurantId,
      status: existing.status,
      paymentStatus: existing.payment_status,
      estimatedReadyAt: existing.estimated_ready_at,
      total: existing.total,
      stripeAccountId: existing.checkout_stripe_account_id,
      stripeCheckoutSessionId: existing.stripe_checkout_session_id,
      restaurantName: (restaurantRow as { name?: string } | null)?.name ?? "Minerva Flow",
      customerEmail: customer.email,
    });
  }
  const [orderSettings, menuItemsResult, restaurantResult] = await Promise.all([
    getRestaurantOrderSettings(admin, customer.restaurantId),
    admin
      .from("menu_items")
      .select("id, name, price")
      .eq("restaurant_id", customer.restaurantId)
      .eq("active", true)
      .in(
        "id",
        cart.map((l) => l.menuItemId)
      ),
    admin.from("restaurants").select("timezone, name, city, province").eq("id", customer.restaurantId).maybeSingle(),
  ]);
  if (!orderSettings) return { ok: false };
  const checkoutOptions = getPublicCheckoutOptions(
    orderSettings.orderModesEnabled,
    orderSettings.onlinePaymentEnabled && Boolean(orderSettings.stripeConnectAccountId),
    orderSettings.delivery.config.enabled
  );
  const fulfillmentMode = delivery ? "livraison" : "sur_place";
  if (!checkoutOptions.fulfillmentModes.includes(fulfillmentMode)) return { ok: false };
  if (payOnline ? !checkoutOptions.canPayOnline : !checkoutOptions.canPayAtReceipt) return { ok: false };

  const schedule = validateRequestedReadyAt(requestedReadyAtLocal, restaurantResult.data?.timezone ?? "America/Toronto");
  if (!schedule.ok) return { ok: false };

  const menuItemById = new Map(
    ((menuItemsResult.data as { id: string; name: string; price: number }[]) ?? []).map((r) => [r.id, r])
  );

  const pricing = computeOrderPricing({
    cart,
    menuItemById,
    taxRate: orderSettings.taxRate,
    acceptsTips: orderSettings.acceptsTips,
    requestedTipAmount: tipAmount,
  });
  if (!pricing) return { ok: false };
  const { lineItems, subtotal, taxAmount, tipAmount: appliedTip, total } = pricing;

  const restaurantAddress = restaurantResult.data as { timezone?: string | null; city?: string | null; province?: string | null; name?: string | null } | null;
  if (delivery && (!delivery.address.trim() || delivery.address.length > 240)) return { ok: false };
  let deliveryCoordinates: { lat: number; lng: number } | null = null;
  if (delivery) {
    // Delivery fees/radius must be derived from the submitted address on the
    // server. Never trust client coordinates: a modified app/request could
    // otherwise quote a nearby address while delivering somewhere else.
    deliveryCoordinates = await geocodeAddress(
      delivery.address,
      restaurantAddress?.city ?? "",
      restaurantAddress?.province ?? undefined
    );
  }
  const deliveryQuote = delivery
    ? quoteDelivery(
        orderSettings.delivery.config,
        { lat: orderSettings.delivery.restaurantLat, lng: orderSettings.delivery.restaurantLng },
        deliveryCoordinates
      )
    : { available: true, fee: 0, distanceKm: null, etaMinutes: null };
  if (delivery && (!delivery.address.trim() || !deliveryQuote.available)) return { ok: false };
  if (delivery && deliveryQuote.reason === "missing_location") return { ok: false };
  const deliveryFee = delivery ? deliveryQuote.fee : 0;

  const computedReadyAt = computeEstimatedReadyAt(orderSettings.defaultPrepMinutes, orderSettings.isBusy);
  const estimatedReadyAt = schedule.requestedReadyAt ? new Date(schedule.requestedReadyAt) : computedReadyAt;

  const { data: checkoutRows, error: checkoutError } = await admin.rpc("create_or_get_public_order", {
    p_restaurant_id: customer.restaurantId,
    p_checkout_key: idempotencyKey,
    p_checkout_user_id: customer.userId,
    p_request_fingerprint: fingerprint,
    p_customer_id: customer.id,
    p_guest_name: customer.name,
    p_guest_phone: customer.phone,
    p_subtotal: subtotal,
    p_tax_amount: taxAmount,
    p_tip_amount: appliedTip,
    p_total: total + deliveryFee,
    p_payment_method: payOnline ? "Carte (en ligne)" : paymentMethod,
    p_payment_status: payOnline ? "en_attente" : "non_requis",
    p_fulfillment_mode: fulfillmentMode,
    p_delivery_address: delivery?.address.trim() ?? null,
    p_delivery_lat: deliveryCoordinates?.lat ?? null,
    p_delivery_lng: deliveryCoordinates?.lng ?? null,
    p_delivery_distance_km: deliveryQuote.distanceKm,
    p_delivery_fee: deliveryFee,
    p_delivery_eta_minutes: deliveryQuote.etaMinutes,
    p_estimated_ready_at: estimatedReadyAt?.toISOString() ?? null,
    p_requested_ready_at: schedule.requestedReadyAt,
    p_referral_link_id: null,
    p_referral_channel: "direct",
    p_notes: `[${source}]`,
    p_stripe_account_id: orderSettings.stripeConnectAccountId,
    p_source: source,
    p_items: lineItems.map((line) => ({
      menu_item_id: line.menuItemId,
      item_name: line.itemName,
      unit_price: line.unitPrice,
      quantity: line.quantity,
    })),
  });
  const checkout = (checkoutRows as PortalCheckoutRow[] | null)?.[0];
  if (checkoutError || !checkout) {
    console.error("submitPortalOrder: atomic checkout persistence failed", checkoutError?.code ?? "empty_result");
    return { ok: false };
  }

  if (checkout.created) {
    await notifyRestaurant({
      restaurantId: customer.restaurantId,
      type: "order.created",
      title: "Nouvelle commande — portail client",
      body: `${customer.name} — ${formatCurrency(total + deliveryFee)}${payOnline ? " · paiement en attente" : ""}`,
      link: "/commandes",
    }).catch(() => {
      // The persisted checkout attempt is returned on retries; never resend
      // this best-effort notification for the same idempotency key.
    });
  }

  return completePortalOrderCheckout(admin, {
    orderId: checkout.order_id,
    restaurantId: customer.restaurantId,
    status: checkout.order_status,
    paymentStatus: checkout.payment_status,
    estimatedReadyAt: checkout.estimated_ready_at,
    total: Number(checkout.total),
    stripeAccountId: checkout.stripe_account_id,
    stripeCheckoutSessionId: checkout.stripe_checkout_session_id,
    restaurantName: restaurantAddress?.name ?? "Minerva Flow",
    customerEmail: customer.email,
  });
}

export async function resumePortalOrder(
  customer: Customer,
  idempotencyKey: string
): Promise<SubmitPortalOrderResult> {
  if (!customer.userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return { ok: false };
  }
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`order-resume:${ip}`, { max: 30, windowSeconds: 300 });
  if (!allowed) return { ok: false };

  const admin = createAdminClient();
  const { data: order, error } = await admin.from("orders")
    .select("id, status, payment_status, stripe_checkout_session_id, estimated_ready_at, total, checkout_stripe_account_id")
    .eq("restaurant_id", customer.restaurantId)
    .eq("customer_id", customer.id)
    .eq("public_checkout_user_id", customer.userId)
    .eq("public_checkout_key", idempotencyKey)
    .maybeSingle();
  if (error || !order) return { ok: false };

  const existing = order as {
    id: string;
    status: string;
    payment_status: string;
    stripe_checkout_session_id: string | null;
    estimated_ready_at: string | null;
    total: number;
    checkout_stripe_account_id: string | null;
  };
  const { data: restaurantRow } = await admin.from("restaurants").select("name")
    .eq("id", customer.restaurantId).maybeSingle();
  return completePortalOrderCheckout(admin, {
    orderId: existing.id,
    restaurantId: customer.restaurantId,
    status: existing.status,
    paymentStatus: existing.payment_status,
    estimatedReadyAt: existing.estimated_ready_at,
    total: existing.total,
    stripeAccountId: existing.checkout_stripe_account_id,
    stripeCheckoutSessionId: existing.stripe_checkout_session_id,
    restaurantName: (restaurantRow as { name?: string } | null)?.name ?? "Minerva Flow",
    customerEmail: customer.email,
  });
}
