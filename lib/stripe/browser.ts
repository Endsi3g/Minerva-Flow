"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/** Returns null (once resolved) if NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY isn't set — same graceful-absence contract as every other integration in this codebase. */
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}
