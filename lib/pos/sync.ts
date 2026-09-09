import { getValidSquareAccessToken, fetchSquareDailyTickets } from "@/lib/pos/square";
import { getValidLightspeedAccessToken, fetchLightspeedDailySales } from "@/lib/pos/lightspeed";
import { getValidCloverAccessToken, fetchCloverDailyTickets } from "@/lib/pos/clover";
import { getValidToastAccessToken, fetchToastDailyTickets } from "@/lib/pos/toast";
import { ingestPosTickets } from "@/lib/pos/ticket-ingestion";
import { upsertSyncedServiceDayRevenue } from "@/lib/data/service-days";
import { touchPosConnectionSync, getRestaurantTimezoneAdmin, type PosProvider } from "@/lib/data/pos-connections";
import { isoDaysAgo } from "@/lib/utils";

export type SyncResult =
  | { status: "no_token" }
  | { status: "skipped_manual" }
  | { status: "synced"; revenue: number; orderCount: number };

/** Pulls one day of Square sales and tickets, ingesting orders and updating service_days. */
export async function syncSquareSalesForDate(restaurantId: string, date: string): Promise<SyncResult> {
  const accessToken = await getValidSquareAccessToken(restaurantId);
  if (!accessToken) return { status: "no_token" };

  const timeZone = await getRestaurantTimezoneAdmin(restaurantId);
  const tickets = await fetchSquareDailyTickets(accessToken, date, timeZone);
  await ingestPosTickets(restaurantId, "square", tickets);

  const revenue = Math.round(tickets.reduce((sum, t) => sum + t.subtotal, 0) * 100) / 100;
  const result = await upsertSyncedServiceDayRevenue(restaurantId, date, revenue, "square");
  await touchPosConnectionSync(restaurantId, "square");

  if (result === "skipped_manual") return { status: "skipped_manual" };
  return { status: "synced", revenue, orderCount: tickets.length };
}

/** Pulls one day of Lightspeed sales and writes it to service_days, for one restaurant. */
export async function syncLightspeedSalesForDate(restaurantId: string, date: string): Promise<SyncResult> {
  const accessToken = await getValidLightspeedAccessToken(restaurantId);
  if (!accessToken) return { status: "no_token" };

  const { revenue, orderCount } = await fetchLightspeedDailySales(accessToken, date);

  const result = await upsertSyncedServiceDayRevenue(restaurantId, date, revenue, "lightspeed");
  await touchPosConnectionSync(restaurantId, "lightspeed");

  if (result === "skipped_manual") return { status: "skipped_manual" };
  return { status: "synced", revenue, orderCount };
}

/** Pulls one day of Clover sales and tickets, ingesting orders and updating service_days. */
export async function syncCloverSalesForDate(restaurantId: string, date: string): Promise<SyncResult> {
  const tokenInfo = await getValidCloverAccessToken(restaurantId);
  if (!tokenInfo || !tokenInfo.accessToken || !tokenInfo.merchantId) return { status: "no_token" };

  const timeZone = await getRestaurantTimezoneAdmin(restaurantId);
  const tickets = await fetchCloverDailyTickets(
    tokenInfo.accessToken,
    tokenInfo.merchantId,
    date,
    timeZone
  );
  await ingestPosTickets(restaurantId, "clover", tickets);

  const revenue = Math.round(tickets.reduce((sum, t) => sum + t.subtotal, 0) * 100) / 100;
  const result = await upsertSyncedServiceDayRevenue(restaurantId, date, revenue, "clover");
  await touchPosConnectionSync(restaurantId, "clover");

  if (result === "skipped_manual") return { status: "skipped_manual" };
  return { status: "synced", revenue, orderCount: tickets.length };
}

/** Pulls one day of Toast sales and tickets, ingesting orders and updating service_days. */
export async function syncToastSalesForDate(restaurantId: string, date: string): Promise<SyncResult> {
  const tokenInfo = await getValidToastAccessToken(restaurantId);
  if (!tokenInfo || !tokenInfo.accessToken || !tokenInfo.restaurantGuid) return { status: "no_token" };

  const tickets = await fetchToastDailyTickets(
    tokenInfo.accessToken,
    tokenInfo.restaurantGuid,
    date
  );
  await ingestPosTickets(restaurantId, "toast", tickets);

  const revenue = Math.round(tickets.reduce((sum, t) => sum + t.subtotal, 0) * 100) / 100;
  const result = await upsertSyncedServiceDayRevenue(restaurantId, date, revenue, "toast");
  await touchPosConnectionSync(restaurantId, "toast");

  if (result === "skipped_manual") return { status: "skipped_manual" };
  return { status: "synced", revenue, orderCount: tickets.length };
}


/**
 * Provider-agnostic entry point — the cron/webhook/manual-sync callers
 * dispatch through this instead of importing a specific provider's sync
 * function, so adding Clover later is a one-line addition here rather than
 * a change at every call site.
 */
export async function syncPosSalesForDate(
  provider: PosProvider,
  restaurantId: string,
  date: string
): Promise<SyncResult> {
  if (provider === "square") return syncSquareSalesForDate(restaurantId, date);
  if (provider === "lightspeed") return syncLightspeedSalesForDate(restaurantId, date);
  if (provider === "clover") return syncCloverSalesForDate(restaurantId, date);
  if (provider === "toast") return syncToastSalesForDate(restaurantId, date);
  return { status: "no_token" };
}



/**
 * One-time historical pull right after a POS connection is created —
 * without this, a new pilot restaurant would only start seeing synced days
 * from the moment they clicked "Connecter" onward.
 */
export async function backfillPosHistory(
  provider: PosProvider,
  restaurantId: string,
  days = 90
): Promise<number> {
  let syncedCount = 0;
  for (let i = 1; i <= days; i++) {
    const date = isoDaysAgo(i);
    const result = await syncPosSalesForDate(provider, restaurantId, date);
    if (result.status === "synced") syncedCount++;
    if (result.status === "no_token") break;
  }
  return syncedCount;
}
