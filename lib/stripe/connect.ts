import "server-only";
import { getStripeClient } from "@/lib/stripe/config";
import { classifyServiceQuoteCheckout, resolveServiceQuoteCheckoutStatus } from "@/lib/stripe/checkout-status";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

/**
 * Same platform secret key as billing (lib/stripe/config.ts) — Connect
 * just needs the Connect product enabled on the platform account in the
 * Stripe dashboard, which isn't something an env var can detect.
 */
export function isStripeConnectConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Verify a public post-checkout return against Stripe, never against query parameters alone. */
export async function getServiceQuoteCheckoutStatus(sessionId: string): Promise<"paid" | "processing" | "pending" | "invalid"> {
  if (sessionId.length > 255 || !/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(sessionId)) return "invalid";
  let session: Stripe.Checkout.Session;
  try {
    const ip = await getClientIp();
    const limit = await checkRateLimit(`quote-checkout-confirm:${ip}`, { max: 30, windowSeconds: 300 });
    if (!limit.allowed) return "invalid";
    const stripe = getStripeClient();
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return "invalid";
  }

  const stripeStatus = classifyServiceQuoteCheckout(session);
  if (stripeStatus !== "paid") return stripeStatus;
  const quoteId = session.metadata?.quoteId;
  const restaurantId = session.metadata?.restaurantId;
  if (!quoteId || !restaurantId) return "invalid";
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("service_quotes").select("status, converted_order_id")
      .eq("id", quoteId).eq("restaurant_id", restaurantId).eq("checkout_session_id", session.id).maybeSingle();
    if (error) return "processing";
    return resolveServiceQuoteCheckoutStatus(stripeStatus, data as { status: string; converted_order_id: string | null } | null);
  } catch {
    return "processing";
  }
}

function connectFeeBasisPoints(): number {
  const raw = Number(process.env.STRIPE_CONNECT_FEE_PERCENT ?? "0");
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, raw)) * 100;
}

function integrationIdentifier(flow: string, seed: string): string {
  // Stable for the associated Stripe idempotency key, with a pseudo-random
  // eight-letter tracking suffix as required by current Checkout versions.
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  let value = hash >>> 0;
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += String.fromCharCode(97 + (value % 26));
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
  }
  return `minerva-${flow}-${suffix}`;
}

export async function createExpressAccount(email: string | null): Promise<string> {
  const stripe = getStripeClient();
  const account = await stripe.accounts.create({
    type: "express",
    country: "CA",
    email: email ?? undefined,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
  });
  return account.id;
}

export async function createOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripeClient();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

export type ConnectAccountState = {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export async function retrieveAccountState(accountId: string): Promise<ConnectAccountState> {
  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
  };
}

/**
 * Destination charge: created on the platform account (this key), money
 * flows to the restaurant's own Connect account minus
 * application_fee_amount. amountCents must already be the final,
 * server-recomputed total (lib/data/order-pricing.ts) — never trust a
 * client-submitted amount here.
 */
export async function createOrderPaymentIntent(input: {
  orderId: string;
  restaurantId: string;
  connectedAccountId: string;
  amountCents: number;
}): Promise<{ id: string; clientSecret: string }> {
  const stripe = getStripeClient();
  const fee = Math.min(input.amountCents, Math.round((input.amountCents * connectFeeBasisPoints()) / 10000));
  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: "cad",
    automatic_payment_methods: { enabled: true },
    application_fee_amount: fee,
    transfer_data: { destination: input.connectedAccountId },
    metadata: { orderId: input.orderId, restaurantId: input.restaurantId },
  });
  if (!intent.client_secret) throw new Error("Stripe n'a pas retourné de client_secret.");
  return { id: intent.id, clientSecret: intent.client_secret };
}

/**
 * Customer-hosted payment for an owner-issued catering/custom-meal quote.
 * The charge is routed to the restaurant's connected account, and the
 * webhook—not the success redirect—converts it into a production order.
 */
export async function createServiceQuoteCheckoutSession(input: {
  quoteId: string;
  attempt: number;
  restaurantId: string;
  connectedAccountId: string;
  amountCents: number;
  expiresAt: number;
  title: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 50) {
    throw new Error("Le montant du devis doit être d'au moins 0,50 $.");
  }
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt < now + 30 * 60 || input.expiresAt > now + 24 * 60 * 60) {
    throw new Error("L'expiration du devis doit être comprise entre 30 minutes et 24 heures.");
  }
  const stripe = getStripeClient();
  const fee = Math.min(input.amountCents, Math.round((input.amountCents * connectFeeBasisPoints()) / 10000));
  const session = await stripe.checkout.sessions.create({
    integration_identifier: integrationIdentifier("service-quote", `${input.quoteId}-${input.attempt}`),
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    expires_at: input.expiresAt,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "cad",
        unit_amount: input.amountCents,
        product_data: {
          name: input.title.slice(0, 120),
          description: input.description.slice(0, 500),
        },
      },
    }],
    metadata: { kind: "service_quote", quoteId: input.quoteId, restaurantId: input.restaurantId },
    payment_intent_data: {
      application_fee_amount: fee,
      transfer_data: { destination: input.connectedAccountId },
      metadata: { kind: "service_quote", quoteId: input.quoteId, restaurantId: input.restaurantId },
    },
  }, { idempotencyKey: `service-quote-${input.quoteId}-${input.attempt}` });
  if (!session.url) throw new Error("Stripe n'a pas retourné de lien de paiement.");
  return { id: session.id, url: session.url };
}

/** Stripe-hosted checkout for authenticated portal/native menu orders. */
export async function createPortalOrderCheckoutSession(input: {
  orderId: string;
  restaurantId: string;
  connectedAccountId: string;
  amountCents: number;
  restaurantName: string;
  customerEmail: string | null;
}): Promise<{ id: string; url: string }> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 50) {
    throw new Error("Le montant de commande doit être d'au moins 0,50 $.");
  }
  const stripe = getStripeClient();
  const fee = Math.min(input.amountCents, Math.round((input.amountCents * connectFeeBasisPoints()) / 10000));
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app").replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    integration_identifier: integrationIdentifier("portal-order", input.orderId),
    mode: "payment",
    success_url: `${origin}/portal?payment=return&order=${encodeURIComponent(input.orderId)}`,
    cancel_url: `${origin}/portal?payment=cancelled&order=${encodeURIComponent(input.orderId)}`,
    customer_email: input.customerEmail ?? undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "cad",
        unit_amount: input.amountCents,
        product_data: { name: `Commande · ${input.restaurantName}`.slice(0, 120) },
      },
    }],
    metadata: { kind: "portal_order", orderId: input.orderId, restaurantId: input.restaurantId },
    payment_intent_data: {
      application_fee_amount: fee,
      transfer_data: { destination: input.connectedAccountId },
      metadata: { kind: "portal_order", orderId: input.orderId, restaurantId: input.restaurantId },
    },
  }, { idempotencyKey: `portal-order-${input.orderId}` });
  if (!session.url) throw new Error("Stripe n'a pas retourné de lien de paiement.");
  return { id: session.id, url: session.url };
}
