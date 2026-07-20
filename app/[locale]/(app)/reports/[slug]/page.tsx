import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getReport, reportDefs, trendFor, breakdownFor, campaignsForReport, type ReportData } from "@/lib/reports";
import { notFound } from "next/navigation";
import { ReportView } from "./ReportView";
import { DynamicReportView } from "./DynamicReportView";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions } from "@/lib/data/finance";
import { createClient } from "@/lib/supabase/server";
import { isoDaysAgo, DEFAULT_HISTORY_WINDOW_DAYS } from "@/lib/utils";
import { Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

export function generateStaticParams() {
  return reportDefs.map((r) => ({ slug: r.slug }));
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurantId = await getCurrentRestaurantId();
  const t = await getTranslations("reports");

  if (!restaurantId) {
    return (
      <div>
        <PageHeader eyebrow={t("page.title")} title={t("page.title")} />
        <EmptyState
          icon={Store}
          title={t("page.noRestaurantTitle")}
          description={t("page.noRestaurantDescription")}
          action={
            <Button href="/onboarding" size="sm">
              {t("page.configureRestaurant")}
            </Button>
          }
        />
      </div>
    );
  }

  // Handle dynamic AI-generated reports
  if (slug.startsWith("dynamic-")) {
    const reportId = slug.replace("dynamic-", "");
    const supabase = await createClient();
    const { data: artifact } = await supabase
      .from("chat_artifacts")
      .select("*")
      .eq("id", reportId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (!artifact) notFound();

    return (
      <DynamicReportView
        reportId={artifact.id}
        initialTitle={artifact.title}
        type={artifact.type}
        data={artifact.data}
        createdAt={artifact.created_at}
      />
    );
  }

  const historyFrom = isoDaysAgo(DEFAULT_HISTORY_WINDOW_DAYS);
  const [serviceDays, programs, campaigns, financialTransactions] = await Promise.all([
    getServiceDays(restaurantId, { from: historyFrom }),
    getPrograms(restaurantId),
    getCampaigns(restaurantId),
    getFinancialTransactions(restaurantId, { from: historyFrom }),
  ]);

  const data: ReportData = { serviceDays, programs, campaigns, financialTransactions };

  const report = getReport(slug, data);
  if (!report) notFound();

  const trend = trendFor(slug, data);
  const breakdown = breakdownFor(slug, data);
  const reportCampaigns = report.kind === "count" ? campaignsForReport(data) : [];

  return <ReportView report={report} trend={trend} breakdown={breakdown} campaigns={reportCampaigns} />;
}
