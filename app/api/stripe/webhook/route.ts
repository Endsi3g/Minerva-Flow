import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/config";
import { upsertSubscription, getSubscriptionByStripeCustomerId } from "@/lib/data/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

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
      const restaurantId = session.metadata?.restaurantId;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (restaurantId && customerId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertSubscription({
          restaurantId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end * 1000).toISOString(),
        });
        await applyUnappliedReferralReward(restaurantId, customerId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const existing = await getSubscriptionByStripeCustomerId(customerId);
      if (existing) {
        await upsertSubscription({
          restaurantId: existing.restaurantId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.items.data[0]
            ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
            : null,
        });
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
 * credit the first time a restaurant's subscription actually activates —
 * applying at signup time would be premature (no paying subscription to
 * credit yet).
 */
async function applyUnappliedReferralReward(restaurantId: string, stripeCustomerId: string) {
  const admin = createAdminClient();
  const { data: rewards } = await admin
    .from("referral_rewards")
    .select("id, amount")
    .eq("restaurant_id", restaurantId)
    .eq("reward_type", "free_months")
    .eq("applied", false);

  const unapplied = (rewards as { id: string; amount: number }[] | null) ?? [];
  if (unapplied.length === 0) return;

  const stripe = getStripeClient();
  const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!);
  const monthlyAmount = price.unit_amount ?? 0;

  for (const reward of unapplied) {
    await stripe.customers.createBalanceTransaction(stripeCustomerId, {
      amount: -Math.round(monthlyAmount * reward.amount),
      currency: price.currency ?? "cad",
      description: `Récompense de parrainage — ${reward.amount} mois gratuit(s)`,
    });
    await admin
      .from("referral_rewards")
      .update({ applied: true, applied_at: new Date().toISOString() })
      .eq("id", reward.id);
  }
}
