import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAcceptRestaurantOnlinePayments } from "@/lib/stripe/connect-capabilities";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { notifyRestaurant } from "@/lib/data/notifications";
import { createServiceQuoteCheckoutSession, isStripeConnectConfigured } from "@/lib/stripe/connect";
import { sendServiceQuotePaymentEmail } from "@/lib/email/resend";
import { resolveRestaurantLocalDateTime } from "@/lib/orders/scheduling";
import { calculateServiceQuoteTotals, normalizeServiceQuoteLines } from "@/lib/orders/service-quote-pricing";
import { emailMatchOperator } from "@/lib/data/email-match";
import { getRestaurantOrderSettings } from "@/lib/data/menu-shares";
import { isQuoteFulfillmentAvailable } from "@/lib/orders/checkout-options";

export type PublicServiceQuoteInput = {
  quoteType: "custom_meal" | "catering";
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  description: string;
  eventAtLocal: string;
  guestCount?: number | null;
  fulfillmentMode: "sur_place" | "livraison";
  deliveryAddress?: string | null;
  clientNotes?: string | null;
};

export type ServiceQuoteLineInput = {
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
};

export type ServiceQuoteRow = {
  id: string;
  restaurant_id: string;
  customer_id: string | null;
  quote_type: "custom_meal" | "catering";
  status: "requested" | "quoted" | "accepted" | "declined" | "expired" | "converted" | "cancelled";
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  description: string;
  event_at: string | null;
  guest_count: number | null;
  fulfillment_mode: "sur_place" | "livraison";
  delivery_address: string | null;
  currency: string;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  deposit_percent: number;
  deposit_amount: number | null;
  expires_at: string | null;
  client_notes: string | null;
  owner_notes: string | null;
  checkout_url: string | null;
  checkout_attempt: number;
  created_at: string;
  converted_order_id?: string | null;
  order_status?: "soumise" | "confirmee" | "en_preparation" | "prete" | "servie" | "annulee" | null;
  order_payment_status?: "non_requis" | "en_attente" | "paye" | "echoue" | null;
  order_deposit_paid_amount?: number;
  service_quote_lines: ServiceQuoteLineInput[];
};

export type ServiceQuotesLoadResult =
  | { ok: true; quotes: ServiceQuoteRow[] }
  | { ok: false; reason: "unavailable" };

function cleanText(value: string, max: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export async function submitPublicServiceQuote(
  menuToken: string | null,
  input: PublicServiceQuoteInput,
  trustedCustomer?: { restaurantId: string; customerId: string }
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const name = cleanText(input.guestName, 120);
  const phone = cleanText(input.guestPhone, 40);
  const email = cleanText(input.guestEmail, 254).toLowerCase();
  const description = input.description.trim().slice(0, 2000);
  const clientNotes = cleanText(input.clientNotes ?? "", 1000) || null;
  if ((!trustedCustomer && !menuToken) || name.length < 2 || phone.length < 7 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "contact_invalid" };
  if (description.length < 10 || (input.quoteType !== "custom_meal" && input.quoteType !== "catering")) return { ok: false, reason: "details_invalid" };
  if (input.guestCount != null && (!Number.isInteger(input.guestCount) || input.guestCount < 1 || input.guestCount > 5000)) return { ok: false, reason: "guest_count_invalid" };
  if (input.fulfillmentMode === "livraison" && cleanText(input.deliveryAddress ?? "", 500).length < 8) return { ok: false, reason: "delivery_address_required" };

  const ip = await getClientIp();
  const rate = await checkRateLimit(`service-quote:${ip}`, { max: 5, windowSeconds: 3600 });
  if (!rate.allowed) return { ok: false, reason: "rate_limited" };

  const admin = createAdminClient();
  const supabase = await createClient();
  const [shareResult, authResult] = await Promise.all([
    trustedCustomer || !menuToken
      ? Promise.resolve({ data: null })
      : admin.from("menu_shares").select("restaurant_id").eq("token", menuToken).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const restaurantId = trustedCustomer?.restaurantId
    ?? (shareResult.data as { restaurant_id: string } | null)?.restaurant_id;
  if (!restaurantId) return { ok: false, reason: "menu_not_found" };
  const user = authResult.data.user;

  const [{ data: restaurant }, orderSettings] = await Promise.all([
    admin.from("restaurants").select("timezone").eq("id", restaurantId).maybeSingle(),
    getRestaurantOrderSettings(admin, restaurantId),
  ]);
  if (!isQuoteFulfillmentAvailable(input.fulfillmentMode, Boolean(orderSettings?.delivery.config.enabled))) {
    return { ok: false, reason: "delivery_unavailable" };
  }
  const zone = (restaurant as { timezone?: string } | null)?.timezone ?? "America/Toronto";
  const event = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(input.eventAtLocal)
    ? new Date(input.eventAtLocal)
    : resolveRestaurantLocalDateTime(input.eventAtLocal, zone);
  if (!event || !Number.isFinite(event.getTime()) || event.getTime() < Date.now() + 12 * 60 * 60_000 || event.getTime() > Date.now() + 365 * 24 * 60 * 60_000) {
    return { ok: false, reason: "event_time_invalid" };
  }

  let customerId: string | null = trustedCustomer?.customerId ?? null;
  if (!trustedCustomer && user) {
    const { data: customer } = await admin.from("customers").select("id, user_id")
      .eq("restaurant_id", restaurantId).eq("user_id", user.id).maybeSingle();
    customerId = (customer as { id: string } | null)?.id ?? null;
    if (!customerId) {
      const customerEmailQuery = admin.from("customers").select("id, user_id")
        .eq("restaurant_id", restaurantId);
      const { data: emailMatch } = await (emailMatchOperator(email) === "eq"
        ? customerEmailQuery.eq("email", email)
        : customerEmailQuery.ilike("email", email)).maybeSingle();
      const match = emailMatch as { id: string; user_id: string | null } | null;
      if (match && match.user_id == null) {
        const { data: linked } = await admin.from("customers").update({ user_id: user.id, name, phone })
          .eq("id", match.id).is("user_id", null).select("id").maybeSingle();
        customerId = (linked as { id: string } | null)?.id ?? null;
      }
    }
    if (!customerId) {
      const { data: inserted } = await admin.from("customers").insert({
        restaurant_id: restaurantId, user_id: user.id, name, email, phone,
      }).select("id").single();
      customerId = (inserted as { id: string } | null)?.id ?? null;
    }
  }

  const { data: quote, error } = await admin.from("service_quotes").insert({
    restaurant_id: restaurantId,
    customer_id: customerId,
    quote_type: input.quoteType,
    status: "requested",
    guest_name: name,
    guest_phone: phone,
    guest_email: email,
    description,
    event_at: event.toISOString(),
    guest_count: input.guestCount ?? null,
    fulfillment_mode: input.fulfillmentMode,
    delivery_address: input.fulfillmentMode === "livraison" ? cleanText(input.deliveryAddress ?? "", 500) : null,
    client_notes: clientNotes,
  }).select("id").single();
  if (error || !quote) return { ok: false, reason: "save_failed" };

  await notifyRestaurant({
    restaurantId,
    type: "order.created",
    title: input.quoteType === "catering" ? "Nouvelle demande traiteur" : "Nouvelle demande de repas sur mesure",
    body: `${name}${input.guestCount ? ` · ${input.guestCount} convives` : ""} · ${new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: zone }).format(event)}`,
    link: "/commandes",
  }).catch(() => {});
  return { ok: true, id: (quote as { id: string }).id };
}

export async function getServiceQuotesForRestaurant(restaurantId: string): Promise<ServiceQuotesLoadResult> {
  if (!restaurantId) return { ok: true, quotes: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.from("service_quotes").select("*, service_quote_lines(*)")
    .eq("restaurant_id", restaurantId).order("created_at", { ascending: false }).limit(100);
  if (error || !data) {
    console.error("getServiceQuotesForRestaurant: failed to load service quotes", error?.code ?? "unknown");
    return { ok: false, reason: "unavailable" };
  }
  const rawQuotes = data as Array<Record<string, unknown>>;
  const orderIds = [...new Set(rawQuotes.map((quote) => quote.converted_order_id).filter((id): id is string => typeof id === "string"))];
  const orderStatusById = new Map<string, { status: ServiceQuoteRow["order_status"]; paymentStatus: ServiceQuoteRow["order_payment_status"]; depositPaidAmount: number }>();
  if (orderIds.length) {
    const { data: orders, error: ordersError } = await supabase.from("orders")
      .select("id, status, payment_status, deposit_paid_amount")
      .eq("restaurant_id", restaurantId).in("id", orderIds);
    if (ordersError || !orders) {
      console.error("getServiceQuotesForRestaurant: failed to load converted order statuses", ordersError?.code ?? "unknown");
      return { ok: false, reason: "unavailable" };
    }
    for (const order of (orders ?? []) as Array<Record<string, unknown>>) {
      if (typeof order.id !== "string") continue;
      orderStatusById.set(order.id, {
        status: order.status as ServiceQuoteRow["order_status"],
        paymentStatus: order.payment_status as ServiceQuoteRow["order_payment_status"],
        depositPaidAmount: Number(order.deposit_paid_amount ?? 0),
      });
    }
  }
  const quotes = rawQuotes.map((raw) => {
    const order = typeof raw.converted_order_id === "string" ? orderStatusById.get(raw.converted_order_id) : undefined;
    return {
    ...raw,
    status: raw.status === "quoted" && raw.expires_at && Date.parse(String(raw.expires_at)) <= Date.now() ? "expired" : raw.status,
    order_status: order?.status ?? null,
    order_payment_status: order?.paymentStatus ?? null,
    order_deposit_paid_amount: order?.depositPaidAmount ?? 0,
    service_quote_lines: ((raw.service_quote_lines as Array<Record<string, unknown>> | null) ?? []).map((line) => ({
      name: String(line.name ?? ""),
      description: typeof line.description === "string" ? line.description : null,
      quantity: Number(line.quantity ?? 1),
      unitPrice: Number(line.unit_price ?? 0),
    })),
  };
  }) as unknown as ServiceQuoteRow[];
  return { ok: true, quotes };
}

export async function issueServiceQuote(
  restaurantId: string,
  quoteId: string,
  lines: ServiceQuoteLineInput[],
  taxRate: number,
  depositPercent: number,
  ownerNotes: string | null
): Promise<{ ok: true; checkoutUrl: string; emailSent: boolean } | { ok: false; reason: string }> {
  const supabase = await createClient();
  const { data: quoteData, error: quoteError } = await supabase.from("service_quotes").select("*")
    .eq("id", quoteId).eq("restaurant_id", restaurantId).maybeSingle();
  if (quoteError || !quoteData) return { ok: false, reason: "quote_not_found" };
  const quote = quoteData as Omit<ServiceQuoteRow, "service_quote_lines">;
  const expiredByTime = quote.status === "quoted" && Boolean(quote.expires_at) && Date.parse(String(quote.expires_at)) <= Date.now();
  if (!(quote.status === "requested" || quote.status === "expired" || expiredByTime || (quote.status === "quoted" && !quote.checkout_url))) return { ok: false, reason: "quote_not_editable" };
  if (!quote.guest_email) return { ok: false, reason: "customer_email_missing" };
  const admin = createAdminClient();
  const { data: restaurant } = await admin.from("restaurants")
    .select("name, timezone, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_account_api_version, stripe_connect_transfers_status, stripe_connect_recipient_payouts_status")
    .eq("id", restaurantId).maybeSingle();
  const config = restaurant as {
    name?: string;
    timezone?: string;
    stripe_connect_account_id?: string | null;
    stripe_connect_charges_enabled?: boolean;
    stripe_connect_account_api_version?: "v1" | "v2";
    stripe_connect_transfers_status?: "active" | "pending" | "restricted" | "unsupported" | "unrequested";
    stripe_connect_recipient_payouts_status?: "active" | "pending" | "restricted" | "unsupported" | "unrequested";
  } | null;
  const connectedAccountId = config?.stripe_connect_account_id;
  if (!config || !connectedAccountId || !canAcceptRestaurantOnlinePayments({
    platformConfigured: isStripeConnectConfigured(),
    accountId: connectedAccountId,
    apiVersion: config.stripe_connect_account_api_version,
    legacyChargesEnabled: config.stripe_connect_charges_enabled === true,
    transfersStatus: config.stripe_connect_transfers_status ?? "unrequested",
    payoutsStatus: config.stripe_connect_recipient_payouts_status ?? "unrequested",
  })) return { ok: false, reason: "stripe_not_ready" };
  const cleanLines = normalizeServiceQuoteLines(lines);
  if (!cleanLines) {
    return { ok: false, reason: "invalid_lines" };
  }
  if (!calculateServiceQuoteTotals(cleanLines, taxRate, depositPercent)) return { ok: false, reason: "invalid_totals" };
  const expiresAt = new Date(Math.floor((Date.now() + 24 * 60 * 60_000) / 1000) * 1000).toISOString();
  const payloadHash = createHash("sha256").update(JSON.stringify({ lines: cleanLines, taxRate, depositPercent })).digest("hex");
  const { data: issued, error } = await supabase.rpc("issue_service_quote", {
    p_quote_id: quoteId,
    p_lines: cleanLines,
    p_tax_rate: taxRate,
    p_deposit_percent: depositPercent,
    p_expires_at: expiresAt,
    p_checkout_payload_hash: payloadHash,
  });
  if (error || !issued?.[0]) return { ok: false, reason: "issue_failed" };
  const totals = issued[0] as { subtotal: number; tax_amount: number; total: number; deposit_amount: number; checkout_attempt: number };

  try {
    const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app").replace(/\/$/, "");
    const session = await createServiceQuoteCheckoutSession({
      quoteId,
      attempt: Number(totals.checkout_attempt),
      restaurantId,
      connectedAccountId,
      amountCents: Math.round(Number(totals.deposit_amount) * 100),
      expiresAt: Math.floor(Date.parse(expiresAt) / 1000),
      title: `Acompte — ${config.name ?? "Restaurant"}`,
      description: cleanLines.map((line) => `${line.name} ×${line.quantity}`).join(" · ").slice(0, 500),
      successUrl: `${origin}/quote/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/quote/confirmation?payment=cancelled`,
    });
    const { data: savedLink, error: updateError } = await admin.from("service_quotes").update({
      checkout_session_id: session.id,
      checkout_url: session.url,
      owner_notes: cleanText(ownerNotes ?? "", 1000) || null,
    }).eq("id", quoteId).eq("status", "quoted").is("checkout_url", null).select("id").maybeSingle();
    if (updateError) return { ok: false, reason: "payment_link_save_failed" };
    if (!savedLink) {
      const { data: currentLink } = await admin.from("service_quotes").select("checkout_url")
        .eq("id", quoteId).eq("checkout_session_id", session.id).maybeSingle();
      if (currentLink?.checkout_url) return { ok: true, checkoutUrl: currentLink.checkout_url, emailSent: false };
      return { ok: false, reason: "payment_link_save_failed" };
    }
    const emailResult = await sendServiceQuotePaymentEmail({
      to: quote.guest_email,
      guestName: quote.guest_name,
      restaurantName: config.name ?? "Le restaurant",
      checkoutUrl: session.url,
      amount: Number(totals.deposit_amount),
      subtotal: Number(totals.subtotal),
      taxAmount: Number(totals.tax_amount),
      total: Number(totals.total),
      lines: cleanLines,
      eventAt: quote.event_at,
      timeZone: config.timezone ?? "America/Toronto",
      expiresAt,
    });
    return { ok: true, checkoutUrl: session.url, emailSent: emailResult.ok };
  } catch (err) {
    console.error("issueServiceQuote payment link failed:", err);
    return { ok: false, reason: "stripe_failed" };
  }
}
