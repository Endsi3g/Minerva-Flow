import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions } from "@/lib/data/finance";
import { buildReports, reportGroups, type ReportData } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";
import { Store } from "lucide-react";
import Link from "next/link";

const groupLabels: Record<string, string> = {
  Revenue: "Revenu",
  Service: "Service",
  Finance: "Finance",
  Campagnes: "Campagnes",
};

export default async function ReportsIndexPage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return (
      <div>
        <PageHeader eyebrow="Rapports" title="Rapports" />
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
  const reports = buildReports(data);

  return (
    <div>
      <PageHeader eyebrow="Vue globale" title="Rapports" />
      <div className="space-y-8">
        {reportGroups.map((group) => {
          const groupReports = reports.filter((r) => r.group === group);
          if (groupReports.length === 0) return null;
          return (
            <div key={group}>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                {groupLabels[group] ?? group}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {groupReports.map((r) => (
                  <Link key={r.slug} href={`/reports/${r.slug}`}>
                    <Card className="transition-shadow hover:shadow-mv-md">
                      <p className="font-display text-[15px] font-medium text-mv-ink">{r.label}</p>
                      <div className="mt-2 flex items-end justify-between">
                        <p className="font-display text-[22px] font-medium text-mv-ink">
                          {r.unit === "currency" ? formatCurrency(r.value) : r.value}
                        </p>
                        {r.delta !== undefined && (
                          <Badge tone={r.delta >= 0 ? "green" : "red"}>
                            {r.delta >= 0 ? "↑" : "↓"} {Math.abs(r.delta).toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[12.5px] text-mv-ink-soft">{r.summary}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
