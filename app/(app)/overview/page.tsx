import { LiveKpiSync } from "@/components/realtime/LiveKpiSync";
import { LiveAlertsPanel } from "@/components/minerva/LiveAlertsPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContributionHeatmap } from "@/components/charts/ContributionHeatmap";
import { UnifiedTrendChart } from "@/components/charts/UnifiedTrendChart";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { RecommendationsPanel } from "@/components/minerva/RecommendationsPanel";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getPrograms } from "@/lib/data/programs";
import { getServiceDays } from "@/lib/data/service-days";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions, getConnections } from "@/lib/data/finance";
import { getAlertRules, getAlerts } from "@/lib/data/alerts";
import { revenueTrend, margeTrend, joursTrend, type ReportData } from "@/lib/reports";
import { computeAlerts } from "@/lib/engine/alerts";
import { computeRecommendations } from "@/lib/engine/recommendations";
import { formatDate, formatDateFull } from "@/lib/utils";
import { CalendarCheck2, Megaphone, ArrowUpRight, ArrowRight, Store } from "lucide-react";
import type { ProgramStatus, ServiceDay } from "@/lib/types";
import Link from "next/link";

const statusTone: Record<ProgramStatus, "green" | "amber" | "neutral"> = {
  actif: "green",
  planifie: "amber",
  termine: "neutral",
};

const statusLabel: Record<ProgramStatus, string> = {
  actif: "Actif",
  planifie: "Planifié",
  termine: "Terminé",
};

/** First/last ISO date of the current calendar month. */
function currentMonthRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month, 1).toISOString().slice(0, 10);
  const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { from, to, year, month };
}

/** Full calendar-month grid for the heatmap, backed by real service_days (0 for days with no entry). */
function monthHeat(serviceDays: ServiceDay[], year: number, month: number) {
  const byDate = new Map(serviceDays.map((d) => [d.date, d.revenue]));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const out: { date: string; revenue: number; dow: number }[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const iso = date.toISOString().slice(0, 10);
    out.push({ date: iso, revenue: byDate.get(iso) ?? 0, dow: date.getDay() });
  }
  return out;
}

export default async function OverviewPage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return (
      <div>
        <PageHeader eyebrow="Vue globale" title="Overview" />
        <EmptyState
          icon={Store}
          title="Aucun restaurant configuré"
          description="Créez ou rejoignez un restaurant pour voir votre tableau de bord."
          action={
            <Button href="/onboarding" size="sm">
              Configurer un restaurant
            </Button>
          }
        />
      </div>
    );
  }

  const { from, to, year, month } = currentMonthRange();

  const [serviceDays, programs, campaigns, financialTransactions, connections, alertRules, tableAlerts] =
    await Promise.all([
      getServiceDays(restaurantId, { from, to }),
      getPrograms(restaurantId),
      getCampaigns(restaurantId),
      getFinancialTransactions(restaurantId, { from, to }),
      getConnections(restaurantId),
      getAlertRules(restaurantId),
      getAlerts(restaurantId),
    ]);

  const reportData: ReportData = { serviceDays, programs, campaigns, financialTransactions };

  const revTrend = revenueTrend(reportData);
  const margTrend = margeTrend(reportData);
  const joursTr = joursTrend(reportData);

  const alerts = computeAlerts({ serviceDays, connections, alertRules, financialTransactions });
  const recommendations = computeRecommendations({ campaigns, programs, serviceDays, alerts });

  // Rule-engine alerts (recomputed every render) plus any unreviewed rows
  // already persisted in `alerts` (e.g. from the AI assistant or future
  // background jobs) — the combined list seeds the live-updating panel.
  const unreadTableAlerts = tableAlerts.filter((a) => a.status === "nouvelle");
  const combinedAlerts = [...alerts, ...unreadTableAlerts].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const joursSparkData = joursTr.map((d) => ({ date: d.date, value: d.revenue }));

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const campagnesSparkData = [...activeCampaigns]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .reduce<{ date: string; value: number }[]>((acc, c) => {
      const previous = acc.at(-1)?.value ?? 0;
      acc.push({ date: c.startDate, value: previous + c.estimatedRevenue });
      return acc;
    }, []);

  const heat = monthHeat(serviceDays, year, month);

  return (
    <div>
      <LiveKpiSync restaurantId={restaurantId} />
      <PageHeader
        eyebrow="Vue globale"
        title="Overview"
        description="Le pouls de votre restaurant : survolez une courbe pour l'isoler, cliquez pour ouvrir son rapport détaillé."
        action={
          <Button href="/days" variant="secondary" size="sm">
            <CalendarCheck2 size={15} /> Ajouter une journée
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="mv-animate-in lg:col-span-2">
          <Card className="h-full">
            <CardHeader
              eyebrow="Revenus"
              title="Revenu vs marge"
              description="Cumulé, tous programmes — survolez une légende pour l'isoler"
            />
            <UnifiedTrendChart
              series={[
                { key: "revenu", slug: "revenu", label: "Revenu total", color: "var(--mv-green)", data: revTrend },
                { key: "marge", slug: "marge", label: "Marge estimée", color: "var(--mv-lime-dark)", data: margTrend },
              ]}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/reports/journees"
            style={{ animationDelay: "80ms" }}
            className="group mv-animate-in flex-1 rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
          >
            <div className="flex items-start justify-between">
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                Journées de service
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mv-ink/[0.06] text-mv-ink-soft">
                <CalendarCheck2 size={16} strokeWidth={2.2} />
              </div>
            </div>
            <p className="mt-3 font-display text-[28px] font-medium leading-none text-mv-ink">
              {serviceDays.length}
            </p>
            <div className="mt-2">
              <MiniSparkline id="jours" data={joursSparkData} color="var(--mv-amber)" />
            </div>
            <p className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-mv-green-dark">
              Voir le rapport
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>

          <Link
            href="/reports/campagnes"
            style={{ animationDelay: "140ms" }}
            className="group mv-animate-in flex-1 rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
          >
            <div className="flex items-start justify-between">
              <p className="text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                Campagnes actives
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mv-ink/[0.06] text-mv-ink-soft">
                <Megaphone size={16} strokeWidth={2.2} />
              </div>
            </div>
            <p className="mt-3 font-display text-[28px] font-medium leading-none text-mv-ink">
              {activeCampaigns.length}
            </p>
            <div className="mt-2">
              <MiniSparkline id="campagnes" data={campagnesSparkData} color="var(--mv-red)" />
            </div>
            <p className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-mv-green-dark">
              Voir le rapport
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[16px] font-medium text-mv-ink">
              Programmes de revenus
            </h2>
            <Link
              href="/programs"
              className="flex items-center gap-1 text-[12.5px] font-semibold text-mv-green-dark hover:underline"
            >
              Tout voir <ArrowUpRight size={13} />
            </Link>
          </div>
          {programs.length === 0 ? (
            <p className="text-[12.5px] text-mv-ink-faint">
              Aucun programme de revenus pour l&apos;instant.
            </p>
          ) : (
            <div className="space-y-3">
              {programs.slice(0, 4).map((p, i) => (
                <Link
                  key={p.id}
                  href={`/programs?id=${p.id}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="mv-animate-in block rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-[15px] font-medium text-mv-ink">{p.name}</p>
                    <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-mv-ink-faint">
                    {formatDate(p.startDate)} — {formatDate(p.endDate)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mv-animate-in flex flex-col xl:col-span-4" style={{ animationDelay: "100ms" }}>
          <Card className="flex h-full flex-col">
            <CardHeader
              eyebrow="Journées de service"
              title="Heatmap du mois"
              description={formatDateFull(from).split(" ").slice(1).join(" ")}
            />
            <div className="min-h-0 flex-1">
              <ContributionHeatmap data={heat} />
            </div>
          </Card>
        </div>

        <div className="mv-animate-in xl:col-span-3" style={{ animationDelay: "160ms" }}>
          <LiveAlertsPanel restaurantId={restaurantId} initial={combinedAlerts} />
        </div>
      </div>

      <div className="mv-animate-in mt-6" style={{ animationDelay: "260ms" }}>
        <RecommendationsPanel initial={recommendations} />
      </div>
    </div>
  );
}
