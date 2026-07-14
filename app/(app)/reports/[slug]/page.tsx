import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getReport, reportDefs, trendFor, breakdownFor, campaignsForReport, type ReportData } from "@/lib/reports";
import { notFound } from "next/navigation";
import { ReportView } from "./ReportView";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions } from "@/lib/data/finance";
import { Store } from "lucide-react";

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

  if (!restaurantId) {
    return (
      <div>
        <PageHeader eyebrow="Rapports" title="Rapport" />
        <EmptyState
          icon={Store}
          title="Aucun restaurant configuré"
          description="Créez ou rejoignez un restaurant pour voir vos rapports."
          action={
            <Button href="/onboarding" size="sm">
              Configurer un restaurant
            </Button>
          }
        />
      </div>
    );
  }

  const [serviceDays, programs, campaigns, financialTransactions] = await Promise.all([
    getServiceDays(restaurantId),
    getPrograms(restaurantId),
    getCampaigns(restaurantId),
    getFinancialTransactions(restaurantId),
  ]);

  const data: ReportData = { serviceDays, programs, campaigns, financialTransactions };

  const report = getReport(slug, data);
  if (!report) notFound();

  const trend = trendFor(slug, data);
  const breakdown = breakdownFor(slug, data);
  const reportCampaigns = report.kind === "count" ? campaignsForReport(data) : [];

  return <ReportView report={report} trend={trend} breakdown={breakdown} campaigns={reportCampaigns} />;
}
