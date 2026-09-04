import Stripe from "stripe";
import type { PlanTier } from "@/lib/ai/quotas";
import { isSelfServeTier, type BillingInterval, type SelfServePlanTier } from "@/lib/billing/plans";

/**
 * Same "gracefully absent until configured" pattern as lib/ai/config.ts —
 * billing UI stays disabled/hidden until these env vars are set:
 * STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and the per-tier price ids below
 * (created once via scripts/create-stripe-billing-catalog.ts).
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && tierPriceMap().starter.monthly);
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

type TierPriceMap = Record<SelfServePlanTier, { monthly?: string; yearly?: string }>;

function tierPriceMap(): TierPriceMap {
  return {
    starter: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
    },
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    },
  };
}

export function stripePriceIdFor(tier: SelfServePlanTier, interval: BillingInterval): string {
  const priceId = tierPriceMap()[tier][interval];
  if (!priceId) {
    throw new Error(`Aucun price Stripe configuré pour ${tier}/${interval} (voir .env.local).`);
  }
  return priceId;
}

/**
 * Resolves a Stripe price id back to a plan tier + interval, driven off the
 * `minerva_flow_tier` / `minerva_flow_interval` metadata the catalog script
 * stamps on every price — avoids hardcoding a second env-var-keyed map here
 * that could drift from tierPriceMap() above.
 */
export async function resolveTierFromPriceId(
  priceId: string
): Promise<{ tier: PlanTier; interval: BillingInterval } | null> {
  try {
    const stripe = getStripeClient();
    const price = await stripe.prices.retrieve(priceId);
    const tier = price.metadata?.minerva_flow_tier as PlanTier | undefined;
    const interval = price.metadata?.minerva_flow_interval as BillingInterval | undefined;
    if (!tier || !interval || !isSelfServeTier(tier)) return null;
    return { tier, interval };
  } catch {
    return null;
  }
}

/**
 * @deprecated Legacy single flat-plan price id, kept only so any
 * still-active pre-migration subscription can be displayed without
 * crashing. New checkouts always go through stripePriceIdFor().
 */
export function legacyStripePriceId(): string | undefined {
  return process.env.STRIPE_PRICE_ID;
}
