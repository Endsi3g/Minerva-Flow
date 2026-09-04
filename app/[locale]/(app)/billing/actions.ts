"use server";

import { getStripeClient, isStripeConfigured, stripePriceIdFor } from "@/lib/stripe/config";
import { getCurrentWorkspaceMembership } from "@/lib/data/current-workspace";
import { getSubscription } from "@/lib/data/subscriptions";
import { getWorkspaceAiUsage, type WorkspaceAiUsage } from "@/lib/data/ai-usage";
import { isSelfServeTier, type SelfServePlanTier, type BillingInterval } from "@/lib/billing/plans";
import { checkEstablishmentLimit, type EstablishmentLimitCheck } from "@/lib/billing/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

const TRIAL_PERIOD_DAYS = 14;

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

/**
 * Starts a new subscription checkout for a self-serve tier (Starter/Pro).
 * Enterprise has no Stripe price — that CTA routes to a contact form instead
 * (see PricingSection), never through here.
 */
export async function createCheckoutSessionAction(
  tier: SelfServePlanTier,
  interval: BillingInterval
): Promise<string | null> {
  if (!isStripeConfigured() || !isSelfServeTier(tier)) return null;
  const membership = await requireWorkspaceOwner();
  if (!membership) return null;

  const stripe = getStripeClient();
  const origin = await originUrl();
  const priceId = stripePriceIdFor(tier, interval);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: membership.workspaceId,
    metadata: { workspaceId: membership.workspaceId, tier, interval },
    subscription_data: {
      trial_period_days: TRIAL_PERIOD_DAYS,
      metadata: { workspaceId: membership.workspaceId, tier, interval },
    },
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
  });

  return session.url;
}

/**
 * Switches an already-active subscription to a different self-serve tier
 * or billing interval, prorating the difference on the next invoice (Stripe
 * default `create_prorations` behavior) — no new Checkout session needed.
 */
export async function changePlanAction(
  tier: SelfServePlanTier,
  interval: BillingInterval
): Promise<{ ok: boolean; error?: string }> {
  if (!isStripeConfigured() || !isSelfServeTier(tier)) return { ok: false, error: "Facturation non configurée." };
  const membership = await requireWorkspaceOwner();
  if (!membership) return { ok: false, error: "Non autorisé." };

  const subscription = await getSubscription(membership.workspaceId);
  if (!subscription?.stripeSubscriptionId) return { ok: false, error: "Aucun abonnement actif." };

  const stripe = getStripeClient();
  const priceId = stripePriceIdFor(tier, interval);
  const current = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const itemId = current.items.data[0]?.id;
  if (!itemId) return { ok: false, error: "Abonnement invalide." };

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "create_prorations",
    metadata: { ...current.metadata, workspaceId: membership.workspaceId, tier, interval },
  });

  return { ok: true };
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

export type CancellationReason =
  | "too_expensive"
  | "missing_features"
  | "switching_tool"
  | "closing_business"
  | "other";

/**
 * Records the exit feedback and schedules cancellation at period end (never
 * an immediate cancel — the owner keeps access through what they already
 * paid for). The win-back email (lib/email/billing-lifecycle.ts) fires off
 * the Stripe `canceled_at` timestamp set once the subscription truly ends
 * (customer.subscription.deleted), not from this request time.
 */
export async function cancelSubscriptionAction(input: {
  reason: CancellationReason;
  feedback?: string;
  retentionOfferAccepted: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isStripeConfigured()) return { ok: false, error: "Facturation non configurée." };
  const membership = await requireWorkspaceOwner();
  if (!membership) return { ok: false, error: "Non autorisé." };

  const subscription = await getSubscription(membership.workspaceId);
  if (!subscription?.stripeSubscriptionId) return { ok: false, error: "Aucun abonnement actif." };

  const admin = createAdminClient();

  if (input.retentionOfferAccepted) {
    // Kept the subscription — just log the near-miss for churn analytics,
    // nothing to change on the Stripe side.
    await admin.from("subscription_cancellations").insert({
      workspace_id: membership.workspaceId,
      stripe_subscription_id: subscription.stripeSubscriptionId,
      reason: input.reason,
      feedback: input.feedback ?? null,
      retention_offer_shown: true,
      retention_offer_accepted: true,
    });
    return { ok: true };
  }

  const stripe = getStripeClient();
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await admin.from("subscription_cancellations").insert({
    workspace_id: membership.workspaceId,
    stripe_subscription_id: subscription.stripeSubscriptionId,
    reason: input.reason,
    feedback: input.feedback ?? null,
    retention_offer_shown: true,
    retention_offer_accepted: false,
  });

  return { ok: true };
}

/** Undoes a scheduled cancel_at_period_end — "j'ai changé d'avis" path from the billing page. */
export async function resumeSubscriptionAction(): Promise<{ ok: boolean; error?: string }> {
  if (!isStripeConfigured()) return { ok: false, error: "Facturation non configurée." };
  const membership = await requireWorkspaceOwner();
  if (!membership) return { ok: false, error: "Non autorisé." };

  const subscription = await getSubscription(membership.workspaceId);
  if (!subscription?.stripeSubscriptionId) return { ok: false, error: "Aucun abonnement actif." };

  const stripe = getStripeClient();
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  return { ok: true };
}

export type InvoiceListItem = {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "refunded" | "open" | "void";
  invoiceUrl?: string;
  description?: string;
};

export async function listInvoicesAction(): Promise<InvoiceListItem[]> {
  if (!isStripeConfigured()) return [];
  const membership = await getCurrentWorkspaceMembership();
  if (!membership) return [];

  const subscription = await getSubscription(membership.workspaceId);
  if (!subscription) return [];

  const stripe = getStripeClient();
  const invoices = await stripe.invoices.list({ customer: subscription.stripeCustomerId, limit: 12 });

  return invoices.data.map((invoice) => ({
    id: invoice.id ?? invoice.number ?? "",
    date: new Date(invoice.created * 1000).toISOString().slice(0, 10),
    amount: (invoice.amount_paid / 100).toLocaleString("fr-CA", {
      style: "currency",
      currency: invoice.currency ?? "cad",
    }),
    status: invoice.status === "paid" ? "paid" : invoice.status === "void" ? "void" : invoice.status === "open" ? "open" : "refunded",
    invoiceUrl: invoice.hosted_invoice_url ?? undefined,
    description: invoice.lines.data[0]?.description ?? undefined,
  }));
}

export async function getBillingStatusAction(): Promise<{
  configured: boolean;
  subscription: Awaited<ReturnType<typeof getSubscription>>;
  aiUsage: WorkspaceAiUsage | null;
  establishmentCount: number;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
}> {
  const membership = await getCurrentWorkspaceMembership();
  if (!membership) {
    return {
      configured: isStripeConfigured(),
      subscription: null,
      aiUsage: null,
      establishmentCount: 0,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
    };
  }

  const admin = createAdminClient();
  const [subscription, aiUsage, { count }] = await Promise.all([
    getSubscription(membership.workspaceId),
    getWorkspaceAiUsage(membership.workspaceId),
    admin.from("restaurants").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspaceId),
  ]);

  let cancelAtPeriodEnd = false;
  let trialEndsAt: string | null = null;
  if (isStripeConfigured() && subscription?.stripeSubscriptionId) {
    const stripe = getStripeClient();
    const live = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    cancelAtPeriodEnd = live.cancel_at_period_end;
    trialEndsAt = live.trial_end ? new Date(live.trial_end * 1000).toISOString() : null;
  }

  return {
    configured: isStripeConfigured(),
    subscription,
    aiUsage,
    establishmentCount: count ?? 0,
    cancelAtPeriodEnd,
    trialEndsAt,
  };
}

/**
 * Pre-flight check the "Ajouter un établissement" trigger calls before
 * opening the creation form — lets the UI show an upgrade modal instead of
 * a generic error when a Starter workspace is at its 1-establishment limit.
 * createRestaurant() in lib/data/restaurants.ts also re-checks this
 * server-side as defense in depth.
 */
export async function checkCanAddEstablishmentAction(): Promise<EstablishmentLimitCheck | null> {
  const membership = await getCurrentWorkspaceMembership();
  if (!membership) return null;

  const admin = createAdminClient();
  const [aiUsage, { count }] = await Promise.all([
    getWorkspaceAiUsage(membership.workspaceId),
    admin.from("restaurants").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspaceId),
  ]);

  return checkEstablishmentLimit(aiUsage.planTier, count ?? 0);
}
