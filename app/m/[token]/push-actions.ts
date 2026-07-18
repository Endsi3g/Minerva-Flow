"use server";

import { isPushConfigured } from "@/lib/push/send";
import {
  savePushSubscription,
  removePushSubscription,
  type PushSubscriptionInput,
} from "@/lib/data/push-subscriptions";

// Same trio as app/(app)/notifications-actions.ts, duplicated here so the
// public client-mode route group doesn't import server actions from the
// authenticated (app) group. push_subscriptions rows are keyed by the
// authenticated user (customer account via magic link), restaurant_id tags
// which restaurant's offers they signed up for.

export async function isPushConfiguredAction(): Promise<boolean> {
  return isPushConfigured();
}

export async function subscribeToPushAction(
  restaurantId: string | null,
  subscription: PushSubscriptionInput
): Promise<boolean> {
  return savePushSubscription(restaurantId, subscription);
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<void> {
  await removePushSubscription(endpoint);
}
