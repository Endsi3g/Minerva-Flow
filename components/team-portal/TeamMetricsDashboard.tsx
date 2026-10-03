import { CircleDollarSign, Eye, Store, TrendingUp, UserMinus } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { formatCurrency } from "@/lib/utils";
import type { TeamMetricsSnapshot } from "@/lib/data/team-metrics";
import { MrrChart, RestaurantsJoinedChart } from "./TeamMetricsCharts";
import { GtmFocusCard } from "./GtmFocusCard";
import { GtmFunnelCard } from "./GtmFunnelCard";

export function TeamMetricsDashboard({ metrics }: { metrics: TeamMetricsSnapshot }) {
  const hasSubscriptions = metrics.activeSubscriptions > 0 || metrics.mrr > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <GtmFocusCard metrics={metrics} />
        <GtmFunnelCard metrics={metrics} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Restaurants"
          value={metrics.totalRestaurants}
          icon={Store}
          sublabel={`inscrits · hors ${metrics.funnel.demosExcluded} démos/tests`}
          accent="green"
        />
        <StatCard
          label="Nouveaux ce mois"
          value={metrics.newRestaurantsThisMonth}
          delta={metrics.newRestaurantsDeltaPct ?? undefined}
          icon={TrendingUp}
          sublabel={metrics.newRestaurantsDeltaPct === null ? "pas de base de comparaison" : "vs mois dernier"}
          accent="lime"
        />
        <StatCard
          label="MRR"
          value={formatCurrency(metrics.mrr)}
          delta={metrics.mrrDeltaPct ?? undefined}
          icon={CircleDollarSign}
          sublabel={hasSubscriptions ? `${metrics.activeSubscriptions} abonnement${metrics.activeSubscriptions === 1 ? "" : "s"} actif${metrics.activeSubscriptions === 1 ? "" : "s"}` : "aucun abonnement actif"}
          accent="blue"
        />
        <StatCard
          label="Churn ce mois"
          value={metrics.churnRatePct === null ? "—" : `${metrics.churnRatePct.toFixed(1)} %`}
          icon={UserMinus}
          sublabel={
            metrics.churnRatePct === null
              ? "aucun abonné actif en début de mois"
              : `${metrics.churnedThisMonth} annulation${metrics.churnedThisMonth === 1 ? "" : "s"}`
          }
          accent="amber"
        />
        <StatCard
          label="Visiteurs · 30 j"
          value={metrics.visitors ? metrics.visitors.total : "—"}
          delta={metrics.visitors?.deltaPct ?? undefined}
          icon={Eye}
          sublabel={metrics.visitors ? "visiteurs uniques" : "PostHog non branché (clé API manquante)"}
          accent="purple"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Croissance" title="Restaurants inscrits par mois" description="12 derniers mois" />
          <RestaurantsJoinedChart data={metrics.restaurantsJoinedSeries} />
        </Card>
        <Card>
          <CardHeader eyebrow="Revenus" title="MRR dans le temps" description="Reconstitué à partir des dates d’abonnement et d’annulation" />
          <MrrChart data={metrics.mrrSeries} />
          {!hasSubscriptions && (
            <p className="mt-3 text-[12px] leading-relaxed text-mv-ink-faint">
              Aucun abonnement payant pour l’instant — la facturation n’est pas encore activée, donc le MRR reste à zéro. Cette courbe se remplira d’elle-même dès le premier abonné.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
