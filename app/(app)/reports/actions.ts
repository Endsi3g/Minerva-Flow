"use server";

import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions } from "@/lib/data/finance";
import { getReport, trendFor, type ReportData } from "@/lib/reports";
import { exportReportToSheet } from "@/lib/google/sheets";
import { formatCurrency, formatDate } from "@/lib/utils";

export async function exportReportAction(slug: string): Promise<string | null> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return null;

  const [serviceDays, programs, campaigns, financialTransactions] = await Promise.all([
    getServiceDays(restaurantId),
    getPrograms(restaurantId),
    getCampaigns(restaurantId),
    getFinancialTransactions(restaurantId),
  ]);

  const data: ReportData = { serviceDays, programs, campaigns, financialTransactions };
  const report = getReport(slug, data);
  if (!report) return null;

  const trend = trendFor(slug, data);
  const columns = ["Date", "Revenu"];
  const rows = trend.map((t) => [formatDate(t.date), formatCurrency(t.revenue)]);

  return exportReportToSheet(restaurantId, {
    title: `Minerva Flow — ${report.label} — ${formatDate(new Date().toISOString().slice(0, 10))}`,
    columns,
    rows,
  });
}
