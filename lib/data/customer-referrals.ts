import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/tokens";
import { mapReferralProgram, type ReferralProgramRow } from "@/lib/data/referral-programs";
import { getRestaurantOrderSettings } from "@/lib/data/menu-shares";
import { notifyRestaurant } from "@/lib/data/notifications";
import { formatCurrency } from "@/lib/utils";
import { computeOrderPricing } from "@/lib/data/order-pricing";
import { createOrderPaymentIntent } from "@/lib/stripe/connect";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { CustomerReferralLink, ReferralProgram } from "@/lib/types";

export type ReferralLinkTracking = {
  link: CustomerReferralLink;
  programName: string;
  customerName: string;
};

/**
 * Flat, staff-facing view across every program's links for one restaurant —
 * powers the tracking table on /fidelisation ("où il a fait du
 * référencement"). Uses the session client: the customer_referral_links
 * select policy already allows any restaurant member to read rows joined
 * through referral_programs.restaurant_id.
 */
export async function getReferralLinksForRestaurant(restaurantId: string): Promise<ReferralLinkTracking[]> {
  const supabase = await createClient();
  const { data: programRows } = await supabase
    .from("referral_programs")
    .select("id, name")
    .eq("restaurant_id", restaurantId);

  const programs = (programRows as { id: string; name: string }[]) ?? [];
  if (programs.length === 0) return [];
  const programNameById = new Map(programs.map((p) => [p.id, p.name]));

  const { data: linkRows } = await supabase
    .from("customer_referral_links")
    .select("*")
    .in("referral_program_id", programs.map((p) => p.id))
    .order("converted_count", { ascending: false });

  const links = ((linkRows as CustomerReferralLinkRow[]) ?? []).map(mapLink);
  if (links.length === 0) return [];

  const { data: customerRows } = await supabase
    .from("customers")
    .select("id, name")
    .in("id", links.map((l) => l.customerId));
  const customerNameById = new Map(((customerRows as { id: string; name: string }[]) ?? []).map((c) => [c.id, c.name]));

  return links.map((link) => ({
    link,
    programName: programNameById.get(link.referralProgramId) ?? "—",
    customerName: customerNameById.get(link.customerId) ?? "—",
  }));
}

export type CustomerReferralLinkRow = {
  id: string;
  referral_program_id: string;
  customer_id: string;
  code: string;
  clicks: number;
  converted_count: number;
  reward_claimed_at: string | null;
  created_at: string;
};

export function mapLink(row: CustomerReferralLinkRow): CustomerReferralLink {
  return {
    id: row.id,
    referralProgramId: row.referral_program_id,
    customerId: row.customer_id,
    code: row.code,
    clicks: row.clicks,
    convertedCount: row.converted_count,
    rewardClaimedAt: row.reward_claimed_at,
    createdAt: row.created_at,
  };
}

/**
 * Reads/writes on this table always go through the admin client — a
 * customer authenticated via magic link is never a restaurant_members row,
 * so no RLS write policy exists for either side (see migration comment).
 */
export async function getOrCreateReferralLink(
  customerId: string,
  programId: string
): Promise<CustomerReferralLink | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("customer_referral_links")
    .select("*")
    .eq("customer_id", customerId)
    .eq("referral_program_id", programId)
    .maybeSingle();

  if (existing) return mapLink(existing as CustomerReferralLinkRow);

  const code = generateToken(10);
  const { data, error } = await admin
    .from("customer_referral_links")
    .insert({ referral_program_id: programId, customer_id: customerId, code })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapLink(data as CustomerReferralLinkRow);
}

export type PublicReferralLanding = {
  link: CustomerReferralLink;
  program: ReferralProgram;
  restaurantName: string;
  referrerName: string;
};

export async function getReferralLandingByCode(code: string): Promise<PublicReferralLanding | null> {
  const admin = createAdminClient();
  const { data: linkRow } = await admin.from("customer_referral_links").select("*").eq("code", code).maybeSingle();
  if (!linkRow) return null;
  const link = mapLink(linkRow as CustomerReferralLinkRow);

  const [{ data: programRow }, { data: customerRow }] = await Promise.all([
    admin.from("referral_programs").select("*").eq("id", link.referralProgramId).maybeSingle(),
    admin.from("customers").select("name").eq("id", link.customerId).maybeSingle(),
  ]);
  if (!programRow) return null;
  const program = mapReferralProgram(programRow as ReferralProgramRow);
  if (!program.active) return null;

  const { data: restaurantRow } = await admin
    .from("restaurants")
    .select("name")
    .eq("id", program.restaurantId)
    .maybeSingle();

  return {
    link,
    program,
    restaurantName: (restaurantRow as { name: string } | null)?.name ?? "ce restaurant",
    referrerName: (customerRow as { name: string } | null)?.name ?? "quelqu'un",
  };
}

/** Atomic increment (see migration) — no auth check by design, called anonymously from the public /p/[code] landing page. */
export async function recordClick(code: string): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("increment_referral_link_clicks", { p_code: code });
}

/**
 * Shared by submitPublicReservationRequest and submitPublicOrder: a visitor
 * authenticated via magic link is never guaranteed to already have a
 * `customers` row for this specific restaurant (they might be a returning
 * customer at a different restaurant on the platform, or brand new) — find
 * their row scoped to (restaurantId, user_id), or create one.
 */
async function findOrCreateCustomerForUser(
  admin: ReturnType<typeof createAdminClient>,
  restaurantId: string,
  user: { id: string; email: string },
  input: { name: string; phone: string | null }
): Promise<string | null> {
  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  const existingId = (existingCustomer as { id: string } | null)?.id;
  if (existingId) return existingId;

  const { data: newCustomer, error } = await admin
    .from("customers")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      email: user.email,
      phone: input.phone,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error || !newCustomer) return null;
  return (newCustomer as { id: string }).id;
}

export type PublicReservationRequestInput = {
  guestName: string;
  guestPhone: string | null;
  partySize: number;
  reservationTime: string;
};

/**
 * Called after the visitor has completed the magic-link step, so
 * auth.getUser() on the session client identifies them. Finds or creates
 * their own `customers` row for this restaurant (distinct from the
 * referrer's), inserts the reservation as 'demandee' (never
 * auto-confirmed), and logs an uncredited conversion — credited only once
 * staff confirms the reservation (see creditReferralConversion).
 */
export async function submitPublicReservationRequest(
  code: string,
  input: PublicReservationRequestInput
): Promise<boolean> {
  // The page load itself is rate-limited, but that only throttles GETs — a
  // scripted client can call this server action repeatedly without ever
  // reloading the page, flooding a restaurant's reservation queue.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`reservation-submit:${ip}`, { max: 10, windowSeconds: 300 });
  if (!allowed) return false;

  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user?.email) return false;

  const admin = createAdminClient();
  const { data: linkRow } = await admin.from("customer_referral_links").select("*").eq("code", code).maybeSingle();
  if (!linkRow) return false;
  const link = mapLink(linkRow as CustomerReferralLinkRow);

  const { data: programRow } = await admin
    .from("referral_programs")
    .select("*")
    .eq("id", link.referralProgramId)
    .maybeSingle();
  if (!programRow) return false;
  const program = mapReferralProgram(programRow as ReferralProgramRow);

  const customerId = await findOrCreateCustomerForUser(
    admin,
    program.restaurantId,
    { id: user.id, email: user.email },
    { name: input.guestName, phone: input.guestPhone }
  );
  if (!customerId) return false;

  const { data: reservation, error: reservationError } = await admin
    .from("reservations")
    .insert({
      restaurant_id: program.restaurantId,
      guest_name: input.guestName,
      guest_phone: input.guestPhone,
      party_size: input.partySize,
      reservation_time: input.reservationTime,
      status: "demandee",
      is_public_request: true,
      customer_id: customerId,
      referral_link_id: link.id,
    })
    .select("id")
    .single();

  if (reservationError || !reservation) return false;

  await admin.from("customer_referral_conversions").insert({
    referral_link_id: link.id,
    conversion_type: "reservation",
    reservation_id: (reservation as { id: string }).id,
  });

  return true;
}

/**
 * Called when staff confirms/honors a reservation tied to a referral link
 * (app/(app)/reservations/actions.ts). The whole operation — mark the
 * conversion credited, bump the link's converted_count, unlock the reward
 * once the program's goal is reached (display only — staff hands it over
 * manually) — runs atomically in a single SQL function (see migration),
 * row-locked against a double-credit if the reservation's status is
 * changed twice in quick succession. Uses the session client (not the
 * admin client) so the function's internal is_restaurant_member() check
 * evaluates against the real caller.
 */
export async function creditReferralConversion(reservationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("credit_referral_conversion", { p_reservation_id: reservationId });
}

/** Sibling of creditReferralConversion for orders — see migration for the RPC. */
export async function creditReferralConversionForOrder(orderId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("credit_referral_conversion_for_order", { p_order_id: orderId });
}

export type PublicOrderCartLine = {
  menuItemId: string;
  quantity: number;
};

export type PublicOrderGuestInfo = {
  guestName: string;
  guestPhone: string | null;
  paymentMethod: string | null;
  /** Customer-chosen tip in dollars — everything else is recomputed server-side from real menu prices. */
  tipAmount: number;
  /** True if the guest picked "Payer en ligne" — only honored if the restaurant's Connect account is actually active (getRestaurantOrderSettings.onlinePaymentEnabled), otherwise silently falls back to pay-on-site. */
  payOnline: boolean;
};

export type SubmitPublicOrderResult =
  | { ok: false }
  | { ok: true; orderId: string; clientSecret: null }
  | { ok: true; orderId: string; clientSecret: string };

/**
 * Same shape as submitPublicReservationRequest: identify the visitor via
 * their already-completed magic-link session, find-or-create their own
 * customers row, insert the order as 'soumise' (never auto-confirmed —
 * staff advances it in /commandes), and log an uncredited 'achat'
 * conversion if a referral code rode along. Prices are always recomputed
 * from the live menu_items table via computeOrderPricing — a
 * client-submitted cart only supplies item ids and quantities, never
 * amounts, so a tampered request can't change what's actually charged.
 *
 * The order row is always committed first, before any Stripe call, so
 * staff sees it in /commandes immediately even if the guest never
 * completes payment (payment_status stays 'en_attente' until the webhook
 * confirms it — see app/api/stripe/webhook/route.ts). If PaymentIntent
 * creation itself fails (e.g. the Connect account got disabled between
 * page load and submit), degrade gracefully to a normal pay-on-site order
 * rather than losing the order entirely.
 */
export async function submitPublicOrder(
  menuToken: string,
  referralCode: string | null,
  cart: PublicOrderCartLine[],
  guestInfo: PublicOrderGuestInfo
): Promise<SubmitPublicOrderResult> {
  if (cart.length === 0) return { ok: false };

  // Same reasoning as submitPublicReservationRequest — the page load is
  // rate-limited, but a scripted client calling this action directly isn't,
  // and each call can create a real order (and, once online payment is on,
  // a real PaymentIntent) without ever hitting that page-level limit.
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`order-submit:${ip}`, { max: 10, windowSeconds: 300 });
  if (!allowed) return { ok: false };

  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user?.email) return { ok: false };

  const admin = createAdminClient();

  const { data: shareRow } = await admin
    .from("menu_shares")
    .select("restaurant_id")
    .eq("token", menuToken)
    .maybeSingle();
  const restaurantId = (shareRow as { restaurant_id: string } | null)?.restaurant_id;
  if (!restaurantId) return { ok: false };

  // These four all depend only on restaurantId (or nothing) — never on each
  // other's result — so they run concurrently instead of as four sequential
  // round trips.
  const [orderSettings, menuItemsResult, referralLinkResult, customerId] = await Promise.all([
    getRestaurantOrderSettings(admin, restaurantId),
    admin
      .from("menu_items")
      .select("id, name, price")
      .eq("restaurant_id", restaurantId)
      .eq("active", true)
      .in(
        "id",
        cart.map((line) => line.menuItemId)
      ),
    referralCode
      ? admin.from("customer_referral_links").select("id").eq("code", referralCode).maybeSingle()
      : Promise.resolve({ data: null }),
    findOrCreateCustomerForUser(
      admin,
      restaurantId,
      { id: user.id, email: user.email },
      { name: guestInfo.guestName, phone: guestInfo.guestPhone }
    ),
  ]);

  if (!orderSettings || !customerId) return { ok: false };

  const menuItemById = new Map(
    ((menuItemsResult.data as { id: string; name: string; price: number }[]) ?? []).map((r) => [r.id, r])
  );

  const pricing = computeOrderPricing({
    cart,
    menuItemById,
    taxRate: orderSettings.taxRate,
    acceptsTips: orderSettings.acceptsTips,
    requestedTipAmount: guestInfo.tipAmount,
  });
  if (!pricing) return { ok: false };
  const { lineItems, subtotal, taxAmount, tipAmount, total } = pricing;

  const referralLinkId = (referralLinkResult.data as { id: string } | null)?.id ?? null;
  let wantsOnlinePayment = guestInfo.payOnline && orderSettings.onlinePaymentEnabled;

  const baseOrderFields = {
    restaurant_id: restaurantId,
    status: "soumise",
    guest_name: guestInfo.guestName,
    guest_phone: guestInfo.guestPhone,
    subtotal,
    tax_amount: taxAmount,
    tip_amount: tipAmount,
    total,
    is_public_request: true,
    customer_id: customerId,
    referral_link_id: referralLinkId,
  };

  let { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      ...baseOrderFields,
      payment_method: wantsOnlinePayment ? "Carte (en ligne)" : guestInfo.paymentMethod,
      payment_status: wantsOnlinePayment ? "en_attente" : "non_requis",
    })
    .select("id")
    .single();

  // payment_status/stripe_payment_intent_id (migration 0026) may not exist
  // yet in every environment — retry without them rather than breaking
  // order submission entirely for a column PostgREST can't find.
  if (orderError?.code === "PGRST204") {
    wantsOnlinePayment = false;
    ({ data: order, error: orderError } = await admin
      .from("orders")
      .insert({ ...baseOrderFields, payment_method: guestInfo.paymentMethod })
      .select("id")
      .single());
  }

  if (orderError || !order) return { ok: false };
  const orderId = (order as { id: string }).id;

  const { error: itemsError } = await admin.from("order_items").insert(
    lineItems.map((l) => ({
      order_id: orderId,
      menu_item_id: l.menuItemId,
      item_name: l.itemName,
      unit_price: l.unitPrice,
      quantity: l.quantity,
    }))
  );
  if (itemsError) return { ok: false };

  if (referralLinkId) {
    await admin.from("customer_referral_conversions").insert({
      referral_link_id: referralLinkId,
      conversion_type: "achat",
      order_id: orderId,
    });
  }

  await notifyRestaurant({
    restaurantId,
    type: "order.created",
    title: "Nouvelle commande en ligne",
    body: `${guestInfo.guestName} — ${formatCurrency(total)}`,
    link: "/commandes",
  });

  if (!wantsOnlinePayment || !orderSettings.stripeConnectAccountId) {
    return { ok: true, orderId, clientSecret: null };
  }

  try {
    const intent = await createOrderPaymentIntent({
      orderId,
      restaurantId,
      connectedAccountId: orderSettings.stripeConnectAccountId,
      amountCents: Math.round(total * 100),
    });
    await admin.from("orders").update({ stripe_payment_intent_id: intent.id }).eq("id", orderId);
    return { ok: true, orderId, clientSecret: intent.clientSecret };
  } catch {
    // Stripe call failed (e.g. account got disabled mid-flow) — the order
    // itself is already safely committed as a normal order; just fall back
    // to pay-on-site rather than losing it.
    await admin.from("orders").update({ payment_status: "non_requis" }).eq("id", orderId);
    return { ok: true, orderId, clientSecret: null };
  }
}
