import { getValidSquareAccessToken, fetchSquareDailySales } from "@/lib/pos/square";
import { upsertSyncedServiceDayRevenue } from "@/lib/data/service-days";
import { touchPosConnectionSync, getRestaurantTimezoneAdmin } from "@/lib/data/pos-connections";
import { isoDaysAgo } from "@/lib/utils";

export type SyncResult =
  | { status: "no_token" }
  | { status: "skipped_manual" }
  | { status: "synced"; revenue: number; orderCount: number };

/** Pulls one day of Square sales and writes it to service_days, for one restaurant. */
export async function syncSquareSalesForDate(restaurantId: string, date: string): Promise<SyncResult> {
  const accessToken = await getValidSquareAccessToken(restaurantId);
  if (!accessToken) return { status: "no_token" };

  const timeZone = await getRestaurantTimezoneAdmin(restaurantId);
  const { revenue, orderCount } = await fetchSquareDailySales(accessToken, date, timeZone);

  const result = await upsertSyncedServiceDayRevenue(restaurantId, date, revenue, "square");
  await touchPosConnectionSync(restaurantId, "square");

  if (result === "skipped_manual") return { status: "skipped_manual" };
  return { status: "synced", revenue, orderCount };
}

/**
 * One-time historical pull right after a Square connection is created —
 * without this, a new pilot restaurant would only start seeing synced days
 * from the moment they clicked "Connecter" onward.
 */
export async function backfillSquareHistory(restaurantId: string, days = 90): Promise<number> {
  let syncedCount = 0;
  for (let i = 1; i <= days; i++) {
    const date = isoDaysAgo(i);
    const result = await syncSquareSalesForDate(restaurantId, date);
    if (result.status === "synced") syncedCount++;
    if (result.status === "no_token") break;
  }
  return syncedCount;
}
