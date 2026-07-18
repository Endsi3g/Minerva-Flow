"use server";

import { revalidatePath } from "next/cache";
import { isSquareConfigured } from "@/lib/pos/config";
import {
  getPosConnections,
  getRestaurantTimezoneAdmin,
  type PosConnection,
} from "@/lib/data/pos-connections";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { syncSquareSalesForDate } from "@/lib/pos/sync";
import { todayInTimezone } from "@/lib/pos/square";
import { isoDaysAgo } from "@/lib/utils";

export async function getPosStatusAction(
  restaurantId: string
): Promise<{ squareConfigured: boolean; connections: PosConnection[] }> {
  if (!restaurantId) return { squareConfigured: false, connections: [] };
  const connections = await getPosConnections(restaurantId);
  return { squareConfigured: isSquareConfigured(), connections };
}

/**
 * Manually re-pulls today + yesterday's Square sales — useful right after
 * connecting, or if a restaurateur doesn't want to wait for the daily cron.
 * Ignores any client-supplied restaurant id and derives it from the
 * caller's own membership instead, same as the OAuth connect route.
 */
export async function syncPosNowAction(): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) return false;

  const timeZone = await getRestaurantTimezoneAdmin(membership.restaurantId);
  const dates = [todayInTimezone(timeZone), isoDaysAgo(1)];
  await Promise.all(dates.map((date) => syncSquareSalesForDate(membership.restaurantId, date)));

  revalidatePath("/settings");
  return true;
}
