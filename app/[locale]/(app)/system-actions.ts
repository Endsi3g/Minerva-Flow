"use server";

import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { notifyRestaurantManagement } from "@/lib/data/notifications";

/**
 * Mirrors a user-facing error toast into the in-app notification bell for
 * owners/managers — a toast disappears in seconds and is easy to miss;
 * this gives them a persistent trail of what's been failing, without
 * requiring anyone to check an external dashboard (Sentry) they may not
 * have access to. Best-effort: never throws, so a failure here can't turn
 * one broken action into two.
 */
export async function logAppErrorAction(message: string): Promise<void> {
  const membership = await getCurrentMembership();
  if (!membership) return;

  await notifyRestaurantManagement({
    restaurantId: membership.restaurantId,
    type: "system.error",
    title: "Erreur dans l'application",
    body: message,
  }).catch(() => {});
}
