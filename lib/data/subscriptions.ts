import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export type Subscription = {
  workspaceId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: Stripe.Subscription.Status | "incomplete";
  currentPeriodEnd: string | null;
};

type SubscriptionRow = {
  workspace_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: Stripe.Subscription.Status;
  current_period_end: string | null;
};

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    workspaceId: row.workspace_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
  };
}

export async function getSubscription(workspaceId: string): Promise<Subscription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) return null;
  return mapSubscription(data as SubscriptionRow);
}

/** Called from Stripe webhook handlers — always via the admin client, no user session in that context. */
export async function upsertSubscription(input: {
  workspaceId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: Stripe.Subscription.Status;
  currentPeriodEnd: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("subscriptions").upsert(
    {
      workspace_id: input.workspaceId,
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeSubscriptionId,
      status: input.status,
      current_period_end: input.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );
}

export async function getSubscriptionByStripeCustomerId(
  stripeCustomerId: string
): Promise<Subscription | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error || !data) return null;
  return mapSubscription(data as SubscriptionRow);
}
