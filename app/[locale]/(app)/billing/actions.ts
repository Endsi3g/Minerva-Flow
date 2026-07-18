"use server";

import { getStripeClient, isStripeConfigured, stripePriceId } from "@/lib/stripe/config";
import { getCurrentWorkspaceMembership } from "@/lib/data/current-workspace";
import { getSubscription } from "@/lib/data/subscriptions";
import { headers } from "next/headers";

async function requireWorkspaceOwner() {
  const membership = await getCurrentWorkspaceMembership();
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
  const membership = await requireWorkspaceOwner();
  if (!membership) return null;

  const stripe = getStripeClient();
  const origin = await originUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: stripePriceId(), quantity: 1 }],
    client_reference_id: membership.workspaceId,
    metadata: { workspaceId: membership.workspaceId },
    subscription_data: { metadata: { workspaceId: membership.workspaceId } },
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
  });

  return session.url;
}

export async function createBillingPortalSessionAction(): Promise<string | null> {
  if (!isStripeConfigured()) return null;
  const membership = await requireWorkspaceOwner();
  if (!membership) return null;

  const subscription = await getSubscription(membership.workspaceId);
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
  const membership = await getCurrentWorkspaceMembership();
  if (!membership) return { configured: isStripeConfigured(), subscription: null };

  const subscription = await getSubscription(membership.workspaceId);
  return { configured: isStripeConfigured(), subscription };
}
