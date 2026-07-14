"use server";

import { revalidatePath } from "next/cache";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/data/notifications";

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
