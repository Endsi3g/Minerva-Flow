"use server";

import { revalidatePath } from "next/cache";
import { getAlerts, markAllAlertsReviewed, updateAlertStatus } from "@/lib/data/alerts";
import type { Alert } from "@/lib/types";

/** Unread (status "nouvelle") alerts for this restaurant, newest first — used by the topbar bell. */
export async function getUnreadAlertsAction(restaurantId: string): Promise<Alert[]> {
  if (!restaurantId) return [];
  const alerts = await getAlerts(restaurantId);
  return alerts.filter((a) => a.status === "nouvelle").slice(0, 20);
}

export async function markAlertReviewedAction(restaurantId: string, id: string): Promise<void> {
  if (!restaurantId) return;
  await updateAlertStatus(restaurantId, id, "revue");
  revalidatePath("/", "layout");
}

export async function markAllAlertsReviewedAction(restaurantId: string): Promise<void> {
  if (!restaurantId) return;
  await markAllAlertsReviewed(restaurantId);
  revalidatePath("/", "layout");
}
