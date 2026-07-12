import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ContributionHeatmap } from "@/components/charts/ContributionHeatmap";
import { UnifiedTrendChart } from "@/components/charts/UnifiedTrendChart";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { programs, alerts, kpis, heatmapMonth, campaigns } from "@/lib/mock-data";
import { revenueTrend, margeTrend, joursTrend } from "@/lib/reports";
import { formatDate, formatDateFull } from "@/lib/utils";
import { CalendarCheck2, Megaphone, ArrowUpRight, ArrowRight } from "lucide-react";
import type { ProgramStatus } from "@/lib/types";
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

const severityTone = { haute: "red", moyenne: "amber", basse: "neutral" } as const;

const joursSparkData = joursTrend.map((d) => ({ date: d.date, value: d.revenue }));

const campagnesSparkData = (() => {
  let cumulative = 0;
  return [...campaigns]
    .filter((c) => c.status === "active")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((c) => {
      cumulative += c.estimatedRevenue;
      return { date: c.startDate, value: cumulative };
    });
})();

export default function OverviewPage() {
  const heat = heatmapMonth(2026, 6);

  return (
    <div>
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
                { key: "revenu", slug: "revenu", label: "Revenu total", color: "var(--mv-green)", data: revenueTrend },
                { key: "marge", slug: "marge", label: "Marge estimée", color: "var(--mv-lime-dark)", data: margeTrend },
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
              {kpis.serviceDaysCount}
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
              {kpis.activeCampaigns}
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
        </div>

        <div className="mv-animate-in flex flex-col xl:col-span-4" style={{ animationDelay: "100ms" }}>
          <Card className="flex h-full flex-col">
            <CardHeader
              eyebrow="Journées de service"
              title="Heatmap du mois"
              description={formatDateFull("2026-07-01").split(" ").slice(1).join(" ")}
            />
            <div className="min-h-0 flex-1">
              <ContributionHeatmap data={heat} />
            </div>
          </Card>
        </div>

        <div className="mv-animate-in xl:col-span-3" style={{ animationDelay: "160ms" }}>
          <Card className="xl:sticky xl:top-6">
            <CardHeader title="Alertes" description={`${alerts.length} à examiner`} />
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <div
                  key={a.id}
                  style={{ animationDelay: `${220 + i * 50}ms` }}
                  className="mv-animate-in rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3.5"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Badge tone={severityTone[a.severity]} dot>
                      {a.severity === "haute"
                        ? "Priorité haute"
                        : a.severity === "moyenne"
                        ? "À surveiller"
                        : "Info"}
                    </Badge>
                    <span className="text-[11px] text-mv-ink-faint">{formatDate(a.date)}</span>
                  </div>
                  <p className="text-[13px] font-semibold leading-snug text-mv-ink">{a.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-mv-ink-soft">{a.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
