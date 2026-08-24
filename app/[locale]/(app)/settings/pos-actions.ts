"use server";

import { revalidatePath } from "next/cache";
import { isSquareConfigured, isLightspeedConfigured } from "@/lib/pos/config";
import {
  getPosConnections,
  getRestaurantTimezoneAdmin,
  type PosConnection,
  type PosProvider,
} from "@/lib/data/pos-connections";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { syncPosSalesForDate } from "@/lib/pos/sync";
import { todayInTimezone } from "@/lib/pos/shared";
import { isoDaysAgo } from "@/lib/utils";

export type PosProviderConfigured = Record<PosProvider, boolean>;

export async function getPosStatusAction(
  restaurantId: string
): Promise<{ configured: PosProviderConfigured; connections: PosConnection[] }> {
  if (!restaurantId) {
    return { configured: { square: false, lightspeed: false, clover: false }, connections: [] };
  }
  const connections = await getPosConnections(restaurantId);
  return {
    configured: { square: isSquareConfigured(), lightspeed: isLightspeedConfigured(), clover: false },
    connections,
  };
}

/**
 * Manually re-pulls today + yesterday's sales for one provider — useful
 * right after connecting, or if a restaurateur doesn't want to wait for the
 * daily cron. Ignores any client-supplied restaurant id and derives it from
 * the caller's own membership instead, same as the OAuth connect route.
 */
export async function syncPosNowAction(provider: PosProvider): Promise<boolean> {
  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) return false;

  const timeZone = await getRestaurantTimezoneAdmin(membership.restaurantId);
  const dates = [todayInTimezone(timeZone), isoDaysAgo(1)];
  await Promise.all(dates.map((date) => syncPosSalesForDate(provider, membership.restaurantId, date)));

  revalidatePath("/settings");
  return true;
}
