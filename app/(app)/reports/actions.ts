"use server";

import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions } from "@/lib/data/finance";
import { getReport, trendFor, type ReportData } from "@/lib/reports";
import { exportReportToSheet } from "@/lib/google/sheets";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function publishReportAction(
  conversationId: string,
  title: string,
  type: string,
  data: any
): Promise<{ success: boolean; reportId?: string }> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return { success: false };

  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("chat_artifacts")
    .insert({
      conversation_id: conversationId,
      restaurant_id: restaurantId,
      message_id: null, // detached from any message
      type,
      title,
      data: { ...data, isPublished: true },
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("Failed to publish report:", error);
    return { success: false };
  }

  return { success: true, reportId: row.id };
}

export async function deleteReportAction(reportId: string): Promise<boolean> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return false;

  const admin = createAdminClient();
  const { error } = await admin
    .from("chat_artifacts")
    .delete()
    .eq("id", reportId)
    .eq("restaurant_id", restaurantId);

  return !error;
}

export async function renameReportAction(reportId: string, newTitle: string): Promise<boolean> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return false;

  const admin = createAdminClient();
  const { error } = await admin
    .from("chat_artifacts")
    .update({ title: newTitle })
    .eq("id", reportId)
    .eq("restaurant_id", restaurantId);

  return !error;
}
