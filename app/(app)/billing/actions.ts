"use server";

import { getStripeClient, isStripeConfigured, stripePriceId } from "@/lib/stripe/config";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getSubscription } from "@/lib/data/subscriptions";
import { headers } from "next/headers";

async function requireOwner() {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") return null;
  return membership;
}

async function originUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export async function createCheckoutSessionAction(): Promise<string | null> {
  if (!isStripeConfigured()) return null;
  const membership = await requireOwner();
  if (!membership) return null;

  const restaurant = await getRestaurant(membership.restaurantId);
  if (!restaurant) return null;

  const stripe = getStripeClient();
  const origin = await originUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: stripePriceId(), quantity: 1 }],
    client_reference_id: membership.restaurantId,
    metadata: { restaurantId: membership.restaurantId },
    subscription_data: { metadata: { restaurantId: membership.restaurantId } },
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
  });

  return session.url;
}

export async function createBillingPortalSessionAction(): Promise<string | null> {
  if (!isStripeConfigured()) return null;
  const membership = await requireOwner();
  if (!membership) return null;

  const subscription = await getSubscription(membership.restaurantId);
  if (!subscription) return null;

  const stripe = getStripeClient();
  const origin = await originUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/billing`,
  });

  return session.url;
}

export async function getBillingStatusAction(): Promise<{
  configured: boolean;
  subscription: Awaited<ReturnType<typeof getSubscription>>;
}> {
  const membership = await getCurrentMembership();
  if (!membership) return { configured: isStripeConfigured(), subscription: null };

  const subscription = await getSubscription(membership.restaurantId);
  return { configured: isStripeConfigured(), subscription };
}
