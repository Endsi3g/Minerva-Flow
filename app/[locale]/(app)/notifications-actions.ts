"use server";

import { revalidatePath } from "next/cache";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/data/notifications";
import {
  savePushSubscription,
  removePushSubscription,
  type PushSubscriptionInput,
} from "@/lib/data/push-subscriptions";
import { isPushConfigured } from "@/lib/push/send";

export async function getNotificationsAction(restaurantId: string): Promise<Notification[]> {
  if (!restaurantId) return [];
  return getNotifications(restaurantId);
}

export async function markNotificationReadAction(id: string): Promise<void> {
  await markNotificationRead(id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction(restaurantId: string): Promise<void> {
  await markAllNotificationsRead(restaurantId);
  revalidatePath("/", "layout");
}

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
