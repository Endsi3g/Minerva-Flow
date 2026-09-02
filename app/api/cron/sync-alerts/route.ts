import { NextResponse } from "next/server";
import { getServiceDays } from "@/lib/data/service-days";
import { getFinancialTransactions, getConnections } from "@/lib/data/finance";
import { getAlertRules, syncComputedAlerts } from "@/lib/data/alerts";
import { getInventoryItems } from "@/lib/data/inventory";
import { getShiftSchedulesForRange } from "@/lib/data/shift-schedules";
import { getEmployees } from "@/lib/data/employees";
import { getPurchaseOrders } from "@/lib/data/purchase-orders";
import { getSuppliers } from "@/lib/data/suppliers";
import { computeAlerts } from "@/lib/engine/alerts";
import { getAllActiveRestaurantIds } from "@/lib/data/weekly-reports";
import { createAdminClient } from "@/lib/supabase/admin";
import { isoDaysAgo, DEFAULT_HISTORY_WINDOW_DAYS } from "@/lib/utils";

/**
 * Runs once daily (see vercel.json — Vercel's Hobby plan only allows daily
 * cron jobs) so the notification bell and Overview's
 * `unreadTableAlerts` merge — both already written against a persisted `alerts`
 * table — actually have something to read. Mirrors the exact computeAlerts() input
 * set Overview/page.tsx already uses, so the bell never disagrees with what an
 * owner sees live.
 *
 * Every getter below is called with an explicit admin (service-role) client: a cron
 * request carries no browser session/cookies, so the default session-scoped client
 * these getters normally use would hit RLS as an anonymous user and silently return
 * empty data for every restaurant — the exact silent-failure shape this session kept
 * finding elsewhere. The admin client bypasses RLS; restaurantId scoping is still
 * enforced explicitly by every getter's own .eq("restaurant_id", ...) query.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const from = isoDaysAgo(DEFAULT_HISTORY_WINDOW_DAYS);
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekAheadIso = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const restaurantIds = await getAllActiveRestaurantIds();

  const results = await Promise.all(
    restaurantIds.map(async (restaurantId) => {
      const [serviceDays, connections, alertRules, financialTransactions, inventoryItems, shiftSchedules, employees, purchaseOrders, suppliers] =
        await Promise.all([
          getServiceDays(restaurantId, { from }, admin),
          getConnections(restaurantId, admin),
          getAlertRules(restaurantId, admin),
          getFinancialTransactions(restaurantId, { from }, admin),
          getInventoryItems(restaurantId, admin),
          getShiftSchedulesForRange(restaurantId, todayIso, weekAheadIso, admin),
          getEmployees(restaurantId, admin),
          getPurchaseOrders(restaurantId, admin),
          getSuppliers(restaurantId, admin),
        ]);

      const alerts = computeAlerts({
        serviceDays,
        connections,
        alertRules,
        financialTransactions,
        inventoryItems,
        shiftSchedules,
        employees,
        purchaseOrders,
        suppliers,
      });

      const result = await syncComputedAlerts(restaurantId, alerts);
      return { restaurantId, computedCount: alerts.length, synced: result.synced, error: result.error };
    })
  );

  return NextResponse.json({ results });
}
