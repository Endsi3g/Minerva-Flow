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
import { hasGoogleScope, getGoogleConnection } from "@/lib/data/google-connections";
import { sendReportEmail } from "@/lib/google/gmail";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  const origin = new URL(req.url).origin;

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

      // Gmail is a bonus channel on top of the in-app notification, never a
      // replacement — failures here must not affect the notification above.
      let emailSent = false;
      if (await hasGoogleScope(restaurantId, "gmail")) {
        const connection = await getGoogleConnection(restaurantId);
        if (connection?.connectedEmail) {
          const rows = data.metrics
            .map(
              (m) =>
                `<tr><td style="padding:4px 12px">${m.label}</td><td style="padding:4px 12px;text-align:right">${
                  m.unit === "currency" ? formatCurrency(m.value) : m.value
                }</td><td style="padding:4px 12px;text-align:right;color:${m.wowDelta >= 0 ? "#0E5A40" : "#B5473A"}">${
                  m.wowDelta >= 0 ? "+" : ""
                }${m.wowDelta.toFixed(1)}%</td></tr>`
            )
            .join("");
          const html = `<div style="font-family:sans-serif;max-width:480px"><h2>Rapport hebdomadaire — semaine du ${formatDate(weekStart)}</h2><table style="border-collapse:collapse;width:100%">${rows}</table><p><a href="${origin}/reports">Voir le détail dans Minerva Flow</a></p></div>`;
          emailSent = await sendReportEmail(restaurantId, {
            to: connection.connectedEmail,
            subject: `Minerva Flow — rapport de la semaine du ${formatDate(weekStart)}`,
            html,
          });
        }
      }

      return { restaurantId, status: "generated", emailSent };
    })
  );

  return NextResponse.json({ weekStart, results });
}
