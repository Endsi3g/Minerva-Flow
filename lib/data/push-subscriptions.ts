import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(
  restaurantId: string | null,
  subscription: PushSubscriptionInput
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      restaurant_id: restaurantId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  return !error;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Server-only (service role) — reads device subscriptions for a set of
 * users, used when sending pushes. When `restaurantId` is passed, only
 * devices that subscribed while linked to that restaurant are returned —
 * a customer with devices subscribed at two different restaurants must not
 * get a push meant for the other one.
 */
export async function getPushSubscriptionsForUsers(
  userIds: string[],
  restaurantId?: string
): Promise<StoredPushSubscription[]> {
  if (userIds.length === 0) return [];
  const admin = createAdminClient();
  let query = admin.from("push_subscriptions").select("endpoint, p256dh, auth").in("user_id", userIds);
  if (restaurantId) query = query.eq("restaurant_id", restaurantId);
  const { data } = await query;

  return (data as StoredPushSubscription[]) ?? [];
}

/** Server-only — drops a subscription that Web Push reported as gone (404/410). */
export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
