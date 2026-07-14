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
import { createClient } from "@/lib/supabase/server";
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

  // Fetch dynamic AI-generated reports
  const supabase = await createClient();
  const { data: customArtifacts } = await supabase
    .from("chat_artifacts")
    .select("id, title, type, data, created_at")
    .eq("restaurant_id", restaurantId)
    .is("message_id", null);

  const dynamicReports = (customArtifacts ?? [])
    .filter((a) => a.data && (a.data as any).isPublished === true)
    .map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      createdAt: a.created_at,
    }));

  return (
    <div>
      <PageHeader eyebrow="Vue globale" title="Rapports" />
      <div className="space-y-8">
        {/* Dynamic AI-Generated Reports */}
        {dynamicReports.length > 0 && (
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
              Analyses &amp; Rapports IA
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dynamicReports.map((r) => (
                <Link key={r.id} href={`/reports/dynamic-${r.id}`}>
                  <Card className="transition-shadow hover:shadow-mv-md h-full flex flex-col justify-between">
                    <div>
                      <p className="font-display text-[15px] font-semibold text-mv-ink">{r.title}</p>
                      <p className="mt-1.5 text-[12.5px] text-mv-ink-soft">
                        Analyse générée à la demande par l&apos;assistant sur la base de vos métriques.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-mv-border/40 pt-2 text-[11px] text-mv-ink-faint shrink-0">
                      <span>Rapport {r.type === "comparison" ? "comparatif" : r.type === "chart" ? "graphique" : r.type === "table" ? "tableau" : "synthèse"}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString("fr-CA", { dateStyle: "short" })}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

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
