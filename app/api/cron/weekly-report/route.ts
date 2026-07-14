import { NextResponse } from "next/server";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions } from "@/lib/data/finance";
import { buildReports, type ReportData } from "@/lib/reports";
import {
  getAllActiveRestaurantIds,
  getActiveMemberUserIds,
  saveWeeklyReport,
  type WeeklyReportData,
} from "@/lib/data/weekly-reports";
import { broadcastNotification } from "@/lib/data/notifications";
import { formatCurrency } from "@/lib/utils";

/** Monday-Sunday range of the week immediately before the current one. */
function previousWeekRange(now = new Date()) {
  const day = now.getDay(); // 0 = Sunday
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(thisMonday.getDate() - daysSinceMonday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(lastSunday.getDate() - 1);

  return {
    from: lastMonday.toISOString().slice(0, 10),
    to: lastSunday.toISOString().slice(0, 10),
    weekStart: lastMonday.toISOString().slice(0, 10),
  };
}

/**
 * Runs every Monday at 8am (see vercel.json crons config). Protected by
 * CRON_SECRET so it can't be triggered by anyone who finds the URL — Vercel
 * Cron sends this as a Bearer token automatically when the env var is set.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { from, to, weekStart } = previousWeekRange();
  const restaurantIds = await getAllActiveRestaurantIds();

  const results = await Promise.all(
    restaurantIds.map(async (restaurantId) => {
      const [serviceDays, programs, campaigns, financialTransactions] = await Promise.all([
        getServiceDays(restaurantId, { from, to }),
        getPrograms(restaurantId),
        getCampaigns(restaurantId),
        getFinancialTransactions(restaurantId, { from, to }),
      ]);

      const reportData: ReportData = { serviceDays, programs, campaigns, financialTransactions };
      const reports = buildReports(reportData);

      const data: WeeklyReportData = {
        weekStart,
        metrics: reports.map((r) => ({
          label: r.label,
          value: r.value,
          unit: r.unit === "currency" ? "currency" : "count",
          wowDelta: r.delta ?? 0,
          reportSlug: r.slug,
        })),
      };

      const saved = await saveWeeklyReport(restaurantId, weekStart, data);
      if (!saved || saved.alreadyExisted) return { restaurantId, status: "skipped" };

      const revenueMetric = data.metrics.find((m) => m.label.toLowerCase().includes("revenu"));
      const userIds = await getActiveMemberUserIds(restaurantId);
      await broadcastNotification({
        restaurantId,
        userIds,
        type: "weekly_report",
        title: "Votre rapport hebdomadaire est prêt",
        body: revenueMetric
          ? `Revenu de la semaine : ${formatCurrency(revenueMetric.value)}.`
          : "Consultez votre rapport de la semaine dernière.",
        link: "/reports",
      });

      return { restaurantId, status: "generated" };
    })
  );

  return NextResponse.json({ weekStart, results });
}
