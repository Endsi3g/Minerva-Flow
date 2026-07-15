import Stripe from "stripe";

/**
 * Same "gracefully absent until configured" pattern as lib/ai/config.ts —
 * billing UI stays disabled/hidden until these env vars are set:
 * STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID (the flat
 * monthly per-establishment plan, created once in the Stripe dashboard).
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set.");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export function stripePriceId(): string {
  if (!process.env.STRIPE_PRICE_ID) throw new Error("STRIPE_PRICE_ID is not set.");
  return process.env.STRIPE_PRICE_ID;
}
