import { NextResponse } from "next/server";
import { getStripeClient, resolveTierFromPriceId } from "@/lib/stripe/config";
import { upsertSubscription, getSubscriptionByStripeCustomerId } from "@/lib/data/subscriptions";
import { setWorkspacePlanTier } from "@/lib/data/ai-usage";
import { notifyWorkspaceOwners, notifyRestaurant } from "@/lib/data/notifications";
import { getRestaurantIdByStripeConnectAccountId, syncConnectAccountStatus } from "@/lib/data/restaurant-payments";
import { sendBillingLifecycleEmail, getWorkspaceOwnerContact } from "@/lib/email/billing-lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import type Stripe from "stripe";

/** Resolves tier/interval from a subscription's first price and, if it's a
 * self-serve tier, syncs workspace_ai_usage's quota to match — called on
 * every checkout completion and subscription update so a plan change (or a
 * tier we couldn't resolve, e.g. the legacy flat price) never leaves the AI
 * quota out of sync with what the customer is actually paying for. */
async function syncTierFromSubscription(
  workspaceId: string,
  subscription: Stripe.Subscription
): Promise<{ priceId: string | null; tier: string | null; interval: string | null }> {
  const priceId = subscription.items.data[0]?.price.id ?? null;
  if (!priceId) return { priceId: null, tier: null, interval: null };

  const resolved = await resolveTierFromPriceId(priceId);
  if (resolved) {
    await setWorkspacePlanTier(workspaceId, resolved.tier);
    return { priceId, tier: resolved.tier, interval: resolved.interval };
  }
  return { priceId, tier: null, interval: null };
}

/**
 * Not independently testable without a live Stripe account + CLI (`stripe
 * listen --forward-to localhost:3000/api/stripe/webhook`) — built to match
 * Stripe's documented webhook contract, but verify against a real test-mode
 * account before relying on it in production.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });
  }

  const body = await req.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (workspaceId && customerId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const { priceId, tier, interval } = await syncTierFromSubscription(workspaceId, subscription);
        await upsertSubscription({
          workspaceId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end * 1000).toISOString(),
          stripePriceId: priceId,
          billingInterval: (interval as "monthly" | "yearly" | null) ?? null,
          planTier: (tier as "starter" | "pro" | "enterprise" | null) ?? null,
        });
        await applyUnappliedReferralReward(workspaceId, customerId, subscription);
        await notifyWorkspaceOwners({
          workspaceId,
          type: "billing.subscription_activated",
          title: "Abonnement activé",
          body: "Votre abonnement Minerva Flow est maintenant actif. Merci de votre confiance !",
          link: "/billing",
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const previousStatus = (event.data.previous_attributes as { status?: string } | undefined)?.status;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const existing = await getSubscriptionByStripeCustomerId(customerId);
      // A null workspaceId means this Stripe customer maps to a legacy
      // subscription the 0011_workspaces.sql backfill left ambiguous (see
      // its runbook) — skip until it's manually reconciled, rather than
      // upserting a workspace-less duplicate row.
      if (existing && existing.workspaceId) {
        const becamePastDue = subscription.status === "past_due" && previousStatus !== "past_due";
        const leftPastDue = subscription.status !== "past_due" && previousStatus === "past_due";
        const { priceId, tier, interval } = await syncTierFromSubscription(existing.workspaceId, subscription);

        await upsertSubscription({
          workspaceId: existing.workspaceId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.items.data[0]
            ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
            : null,
          stripePriceId: priceId,
          billingInterval: (interval as "monthly" | "yearly" | null) ?? existing.billingInterval,
          planTier: (tier as "starter" | "pro" | "enterprise" | null) ?? existing.planTier,
          pastDueSince: becamePastDue ? new Date().toISOString() : leftPastDue ? null : undefined,
        });

        if (becamePastDue) {
          await notifyWorkspaceOwners({
            workspaceId: existing.workspaceId,
            type: "billing.payment_past_due",
            title: "Problème de paiement",
            body: "Votre dernier paiement a échoué. Mettez à jour votre méthode de paiement pour éviter une interruption de service.",
            link: "/billing",
          });
        } else if (subscription.status === "active" && previousStatus === "past_due") {
          await notifyWorkspaceOwners({
            workspaceId: existing.workspaceId,
            type: "billing.payment_recovered",
            title: "Paiement régularisé",
            body: "Votre abonnement est de nouveau actif — merci d'avoir mis à jour votre méthode de paiement.",
            link: "/billing",
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const existing = await getSubscriptionByStripeCustomerId(customerId);
      if (existing && existing.workspaceId) {
        await upsertSubscription({
          workspaceId: existing.workspaceId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.items.data[0]
            ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
            : null,
          pastDueSince: null,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : new Date().toISOString(),
        });
        await notifyWorkspaceOwners({
          workspaceId: existing.workspaceId,
          type: "billing.subscription_canceled",
          title: "Abonnement annulé",
          body: "Votre abonnement Minerva Flow a été annulé.",
          link: "/billing",
        });
      }
      break;
    }

    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const existing = await getSubscriptionByStripeCustomerId(customerId);
      if (existing && existing.workspaceId) {
        await notifyWorkspaceOwners({
          workspaceId: existing.workspaceId,
          type: "billing.trial_ending",
          title: "Votre essai gratuit se termine bientôt",
          body: "Ajoutez une méthode de paiement pour continuer à utiliser Minerva Flow sans interruption.",
          link: "/billing",
        });
        const owner = await getWorkspaceOwnerContact(existing.workspaceId);
        if (owner) {
          const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
          await sendBillingLifecycleEmail({
            workspaceId: existing.workspaceId,
            email: owner.email,
            step: "trial_ending",
            dedupeKey: subscription.id,
            params: {
              firstName: owner.firstName,
              trialEndDate: trialEnd ? trialEnd.toLocaleDateString("fr-CA") : undefined,
            },
          });
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const existing = await getSubscriptionByStripeCustomerId(customerId);
        if (existing && existing.workspaceId) {
          await notifyWorkspaceOwners({
            workspaceId: existing.workspaceId,
            type: "billing.invoice_payment_failed",
            title: "Échec du paiement de la facture",
            body: "Le paiement de votre dernière facture a échoué. Vérifiez votre méthode de paiement.",
            link: "/billing",
          });
          const owner = await getWorkspaceOwnerContact(existing.workspaceId);
          if (owner) {
            const amount = (invoice.amount_due / 100).toLocaleString("fr-CA", {
              style: "currency",
              currency: invoice.currency ?? "cad",
            });
            await sendBillingLifecycleEmail({
              workspaceId: existing.workspaceId,
              email: owner.email,
              step: "payment_failed",
              dedupeKey: invoice.id ?? `${customerId}:${invoice.created}`,
              params: { firstName: owner.firstName, amountDue: amount },
            });
          }
        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      // Skip the very first invoice — checkout.session.completed already
      // sends an "abonnement activé" notification for that one.
      if (customerId && invoice.billing_reason !== "subscription_create") {
        const existing = await getSubscriptionByStripeCustomerId(customerId);
        if (existing && existing.workspaceId) {
          const amount = (invoice.amount_paid / 100).toLocaleString("fr-CA", {
            style: "currency",
            currency: invoice.currency ?? "cad",
          });
          await notifyWorkspaceOwners({
            workspaceId: existing.workspaceId,
            type: "billing.invoice_payment_succeeded",
            title: "Paiement reçu",
            body: `Votre paiement de ${amount} a été traité avec succès.`,
            link: "/billing",
          });
        }
      }
      break;
    }

    // Destination charges (transfer_data.destination) keep the
    // PaymentIntent on the platform account — these arrive as ordinary
    // events here, no "listen to connected account events" dashboard
    // change needed, unlike account.updated below.
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        const admin = createAdminClient();
        const { data: order } = await admin
          .from("orders")
          .update({ payment_status: "paye", paid_at: new Date().toISOString() })
          .eq("id", orderId)
          .eq("stripe_payment_intent_id", intent.id)
          .select("restaurant_id, guest_name, total")
          .maybeSingle();
        if (order) {
          await notifyRestaurant({
            restaurantId: order.restaurant_id,
            type: "order.paid",
            title: "Commande payée en ligne",
            body: `${order.guest_name} — ${formatCurrency(order.total)}`,
            link: "/commandes",
          });
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        const admin = createAdminClient();
        const { data: order } = await admin
          .from("orders")
          .update({ payment_status: "echoue" })
          .eq("id", orderId)
          .eq("stripe_payment_intent_id", intent.id)
          .select("restaurant_id, guest_name, guest_phone")
          .maybeSingle();
        if (order) {
          await notifyRestaurant({
            restaurantId: order.restaurant_id,
            type: "order.payment_failed",
            title: "Échec de paiement en ligne",
            body: `${order.guest_name}${order.guest_phone ? ` (${order.guest_phone})` : ""} — le paiement a échoué, à suivre.`,
            link: "/commandes",
          });
        }
      }
      break;
    }

    // Connected-account event — requires "Listen to events on connected
    // accounts" enabled on this webhook endpoint in the Stripe dashboard
    // (see docs/integrations.md). payment_intent.* above need no such
    // change since destination charges stay on the platform account.
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const restaurantId = await getRestaurantIdByStripeConnectAccountId(account.id);
      if (restaurantId) {
        const { justActivated } = await syncConnectAccountStatus(restaurantId, {
          chargesEnabled: Boolean(account.charges_enabled),
          payoutsEnabled: Boolean(account.payouts_enabled),
          detailsSubmitted: Boolean(account.details_submitted),
        });
        if (justActivated) {
          await notifyRestaurant({
            restaurantId,
            type: "stripe_connect.activated",
            title: "Paiements en ligne activés",
            body: "Vous pouvez maintenant encaisser vos clients directement en ligne.",
            link: "/settings",
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

/**
 * Grants the referrer's free-month reward as a Stripe customer balance
 * credit the first time a workspace's subscription actually activates —
 * applying at signup time would be premature (no paying subscription to
 * credit yet). referral_rewards is still restaurant-scoped (out of scope
 * for the workspace migration), so this resolves across every restaurant
 * in the workspace rather than a single one.
 */
async function applyUnappliedReferralReward(
  workspaceId: string,
  stripeCustomerId: string,
  subscription: Stripe.Subscription
) {
  const admin = createAdminClient();
  const { data: workspaceRestaurants } = await admin
    .from("restaurants")
    .select("id")
    .eq("workspace_id", workspaceId);

  const restaurantIds = ((workspaceRestaurants as { id: string }[] | null) ?? []).map((r) => r.id);
  if (restaurantIds.length === 0) return;

  const { data: rewards } = await admin
    .from("referral_rewards")
    .select("id, amount")
    .in("restaurant_id", restaurantIds)
    .eq("reward_type", "free_months")
    .eq("applied", false);

  const unapplied = (rewards as { id: string; amount: number }[] | null) ?? [];
  if (unapplied.length === 0) return;

  const stripe = getStripeClient();
  // Reads the price the customer actually subscribed to (Starter/Pro, monthly
  // or yearly) rather than a single global price — necessary now that
  // checkout offers multiple tiers. A yearly price is normalized to its
  // monthly equivalent so "N free months" means the same credit either way.
  const price = subscription.items.data[0]?.price;
  const monthlyAmount = price?.recurring?.interval === "year" ? Math.round((price.unit_amount ?? 0) / 12) : (price?.unit_amount ?? 0);

  for (const reward of unapplied) {
    await stripe.customers.createBalanceTransaction(stripeCustomerId, {
      amount: -Math.round(monthlyAmount * reward.amount),
      currency: price?.currency ?? "cad",
      description: `Récompense de parrainage — ${reward.amount} mois gratuit(s)`,
    });
    await admin
      .from("referral_rewards")
      .update({ applied: true, applied_at: new Date().toISOString() })
      .eq("id", reward.id);
  }
}
