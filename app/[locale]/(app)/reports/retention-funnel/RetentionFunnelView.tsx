"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import type {
  RetentionFunnelDashboardData,
  RetentionTimeRange,
  RetentionKpi,
} from "@/lib/data/retention-metrics";
import {
  QrCode,
  UserCheck,
  Repeat,
  Clock,
  Gift,
  ShoppingBag,
  DollarSign,
  UserX,
  TrendingUp,
  Sparkles,
  Send,
  CheckCircle2,
  Info,
  Layers,
  Activity,
  Award,
  ChevronRight,
} from "lucide-react";

type Props = {
  data: RetentionFunnelDashboardData;
};

export function RetentionFunnelView({ data }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"funnel" | "matrix" | "events">("funnel");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const currentRange = (searchParams?.get("range") as RetentionTimeRange) || data.timeRange || "30d";

  const handleRangeChange = (newRange: RetentionTimeRange) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("range", newRange);
    router.push(`/reports/retention-funnel?${params.toString()}`);
  };

  const { kpis, funnelSteps, recentEvents, rawCounts, customerVisitCohorts } = data;

  const filteredEvents =
    stageFilter === "all"
      ? recentEvents
      : recentEvents.filter((e) => e.stage === stageFilter);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Quote from Audit */}
      <div className="relative overflow-hidden rounded-2xl border border-mv-border bg-gradient-to-br from-mv-cream via-mv-surface to-mv-cream-soft p-6 shadow-sm">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-mv-green/5 blur-2xl pointer-events-none" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mv-green-tint px-2.5 py-0.5 text-xs font-semibold text-mv-green-dark">
                <Sparkles size={13} className="text-mv-green" />
                Matrice d&apos;attribution & Rétention Minerva Flow
              </span>
              <span className="text-xs text-mv-ink-faint">Fenêtre 7 jours post-campagne</span>
            </div>
            <h1 className="font-serif text-2xl font-medium tracking-tight text-mv-ink sm:text-3xl">
              Entonnoir de rétention & Cycle de vie
            </h1>
            <p className="text-[13.5px] leading-relaxed text-mv-ink-soft">
              « Le taux de rétention, le taux d’échange, le retour des offres et la valeur client sont des métriques beaucoup plus utiles qu’un simple nombre d’inscrits. »
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-mv-border bg-mv-surface p-1 shadow-xs">
            {(
              [
                { id: "7d", label: "7 jours" },
                { id: "30d", label: "30 jours" },
                { id: "90d", label: "90 jours" },
                { id: "all", label: "Tout" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => handleRangeChange(t.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  currentRange === t.id
                    ? "bg-mv-green text-white shadow-xs"
                    : "text-mv-ink-soft hover:bg-mv-cream hover:text-mv-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-mv-border-soft">
          <button
            onClick={() => setActiveTab("funnel")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === "funnel"
                ? "border-mv-green font-semibold text-mv-green-dark"
                : "border-transparent text-mv-ink-soft hover:text-mv-ink"
            }`}
          >
            <Layers size={14} />
            Entonnoir & 10 KPI clés
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === "matrix"
                ? "border-mv-green font-semibold text-mv-green-dark"
                : "border-transparent text-mv-ink-soft hover:text-mv-ink"
            }`}
          >
            <Award size={14} />
            Cohortes de visite
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === "events"
                ? "border-mv-green font-semibold text-mv-green-dark"
                : "border-transparent text-mv-ink-soft hover:text-mv-ink"
            }`}
          >
            <Activity size={14} />
            Journal d’événements ({recentEvents.length})
          </button>
        </div>
      </div>

      {activeTab === "funnel" && (
        <div className="space-y-6">
          {/* Visual Interactive Funnel Bar */}
          <Card className="overflow-hidden border border-mv-border bg-mv-surface p-6">
            <div className="flex flex-col gap-1.5 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-mv-ink">
                  Conversion par étape du cycle de vie
                </h2>
                <Badge variant="outline" className="border-mv-green/30 text-mv-green-dark bg-mv-green-tint/50 text-[11px]">
                  Rétention 2e visite : {kpis.secondVisitRate.formattedValue}
                </Badge>
              </div>
              <p className="text-xs text-mv-ink-soft">
                De l&apos;exposition du QR code jusqu&apos;à la confirmation de l&apos;habitude au comptoir.
              </p>
              <p className="mt-2 text-[11px] text-mv-ink-faint">
                La période choisie filtre les événements; les indicateurs calculés depuis les profils clients (visites, fréquence, cohortes) sont cumulatifs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {funnelSteps.map((step, idx) => {
                const isFinal = idx === funnelSteps.length - 1;
                return (
                  <div
                    key={step.id}
                    className="relative flex flex-col justify-between rounded-xl border border-mv-border-soft bg-mv-cream-soft/50 p-4 transition-all hover:border-mv-border hover:shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-mv-ink-faint mb-2">
                        <span className="font-mono text-[11px] font-semibold text-mv-ink-soft">
                          Étape {idx + 1}
                        </span>
                        {step.conversionFromPrev !== null && (
                          <span
                            className={`font-mono text-[11px] font-medium ${
                              step.conversionFromPrev >= 70
                                ? "text-emerald-700"
                                : step.conversionFromPrev >= 40
                                  ? "text-amber-700"
                                  : "text-rose-700"
                            }`}
                          >
                            {step.conversionFromPrev} % conv.
                          </span>
                        )}
                      </div>

                      <div className="font-serif text-2xl font-bold tracking-tight text-mv-ink mb-1 font-mono">
                        {step.count.toLocaleString("fr-CA")}
                      </div>

                      <div className="text-xs font-medium text-mv-ink-soft mb-3">
                        {step.label}
                      </div>
                    </div>

                    {/* Funnel conversion bar */}
                    <div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-mv-border/40">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(8, step.conversionFromTotal)}%`,
                            backgroundColor: step.color,
                          }}
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-mv-ink-faint font-mono">
                        <span>{step.conversionFromTotal} % du total</span>
                        {step.dropoffFromPrev !== null && step.dropoffFromPrev > 0 && (
                          <span className="text-rose-600">-{step.dropoffFromPrev} % perte</span>
                        )}
                      </div>
                    </div>

                    {!isFinal && (
                      <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 items-center justify-center rounded-full border border-mv-border bg-mv-surface text-mv-ink-faint shadow-xs">
                        <ChevronRight size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 10 KPI Grid */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-semibold text-mv-ink">
                  Les 10 KPI essentiels du restaurateur
                </h2>
                <p className="text-xs text-mv-ink-soft">
                  Indicateurs de rétention, rentabilité et performance des campagnes, calibrés selon les audits réels.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {/* KPI 1 */}
              <KpiCard
                kpi={kpis.scanToSignupRate}
                icon={QrCode}
              />

              {/* KPI 2 */}
              <KpiCard
                kpi={kpis.activationRate}
                icon={UserCheck}
              />

              {/* KPI 3 - Featured Gold KPI */}
              <KpiCard
                kpi={kpis.secondVisitRate}
                icon={Repeat}
                highlighted
              />

              {/* KPI 4 */}
              <KpiCard
                kpi={kpis.thirtyDayReturnRate}
                icon={Clock}
              />

              {/* KPI 5 */}
              <KpiCard
                kpi={kpis.averageVisitFrequency}
                icon={TrendingUp}
              />

              {/* KPI 6 */}
              <KpiCard
                kpi={kpis.rewardRedemptionRate}
                icon={Gift}
              />

              {/* KPI 7 */}
              <KpiCard
                kpi={kpis.averageMemberBasket}
                icon={ShoppingBag}
              />

              {/* KPI 8 */}
              <KpiCard
                kpi={kpis.campaignAttributedRevenue}
                icon={DollarSign}
              />

              {/* KPI 9 */}
              <KpiCard
                kpi={kpis.costPerReactivatedCustomer}
                icon={Send}
              />

              {/* KPI 10 */}
              <KpiCard
                kpi={kpis.unsubscribeRate}
                icon={UserX}
              />
            </div>
          </div>

          {/* Operational Insights Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 border border-mv-border bg-mv-surface">
              <div className="flex items-center gap-2 mb-2 text-mv-green-dark">
                <CheckCircle2 size={16} className="text-mv-green" />
                <h3 className="font-serif text-sm font-semibold text-mv-ink">
                  Attribution Campagne (7 jours)
                </h3>
              </div>
              <p className="text-xs text-mv-ink-soft leading-relaxed">
                Les visites reliées à une campagne sont celles enregistrées explicitement dans les événements de fidélité.
                Sur la période choisie : <strong className="text-mv-ink">{kpis.campaignAttributedRevenue.formattedValue}</strong> associés à <strong className="text-mv-ink">{rawCounts.campaignVisits}</strong> visites explicitement attribuées.
              </p>
            </Card>

            <Card className="p-5 border border-mv-border bg-mv-surface">
              <div className="flex items-center gap-2 mb-2 text-mv-amber">
                <Sparkles size={16} className="text-mv-amber" />
                <h3 className="font-serif text-sm font-semibold text-mv-ink">
                  Programme de Parrainage
                </h3>
              </div>
              <p className="text-xs text-mv-ink-soft leading-relaxed">
                <strong className="text-mv-ink">{rawCounts.referralsSent}</strong> envois et <strong className="text-mv-ink">{rawCounts.referralsConverted}</strong> conversions de parrainage ont été consignés.
              </p>
            </Card>

            <Card className="p-5 border border-mv-border bg-mv-surface">
              <div className="flex items-center gap-2 mb-2 text-mv-ink">
                <Info size={16} className="text-mv-ink-faint" />
                <h3 className="font-serif text-sm font-semibold text-mv-ink">
                  Protection CASL / LCAP
                </h3>
              </div>
              <p className="text-xs text-mv-ink-soft leading-relaxed">
                Taux de désinscription : <strong className="text-mv-ink">{kpis.unsubscribeRate.formattedValue}</strong> ({rawCounts.unsubscribes} désinscriptions sur {rawCounts.messagesDelivered} livraisons observées). Ce taux ne permet pas à lui seul de conclure sur la conformité ou la délivrabilité.
              </p>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "matrix" && (
        <div className="space-y-4">
          <Card className="border border-mv-border bg-mv-surface p-6">
            <div className="mb-5 max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-mv-ink-faint font-mono">Données du restaurant sélectionné</span>
              <h2 className="mt-1 font-serif text-xl font-medium text-mv-ink">Groupes selon les visites cumulées</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-mv-ink-soft">Ces groupes sont calculés à partir des profils membres de cet établissement. Ils ne partagent aucun nom ni indicateur d’un autre restaurant.</p>
            </div>
            {customerVisitCohorts.every((cohort) => cohort.members === 0) ? (
              <div className="rounded-xl border border-dashed border-mv-border p-6 text-center text-sm text-mv-ink-faint">Aucun membre à segmenter pour le moment.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {customerVisitCohorts.map((cohort) => (
                  <section key={cohort.id} className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/50 p-4">
                    <h3 className="text-sm font-semibold text-mv-ink">{cohort.label}</h3>
                    <p className="mt-3 font-serif text-3xl text-mv-green-dark">{cohort.members}</p>
                    <p className="text-xs text-mv-ink-faint">membres</p>
                    <dl className="mt-4 space-y-2 border-t border-mv-border-soft pt-3 text-xs">
                      <div className="flex justify-between gap-3"><dt className="text-mv-ink-faint">Visites moyennes</dt><dd className="font-semibold text-mv-ink">{cohort.averageVisits.toFixed(1)}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-mv-ink-faint">Dépenses cumulées moyennes</dt><dd className="font-semibold text-mv-ink">{new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(cohort.averageSpend)}</dd></div>
                    </dl>
                  </section>
                ))}
              </div>
            )}
            <p className="mt-4 text-[11px] text-mv-ink-faint">Les visites et dépenses reflètent les valeurs cumulées dans les profils clients; leur disponibilité dépend des connexions caisse et des mises à jour manuelles.</p>
          </Card>
        </div>
      )}

      {activeTab === "events" && (
        <div className="space-y-4">
          <Card className="border border-mv-border bg-mv-surface p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="font-serif text-lg font-semibold text-mv-ink">
                  Événements de cycle de vie
                </h2>
                <p className="text-xs text-mv-ink-soft">
                  Événements horodatés enregistrés : acquisition, scans, visites, récompenses, campagnes et parrainages.
                </p>
              </div>

              {/* Stage Filter */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {(
                  [
                    { id: "all", label: "Tous" },
                    { id: "acquisition", label: "Acquisition" },
                    { id: "visite", label: "Visites" },
                    { id: "recompense", label: "Récompenses" },
                    { id: "campagne", label: "Campagnes" },
                    { id: "parrainage", label: "Parrainages" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStageFilter(s.id)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      stageFilter === s.id
                        ? "bg-mv-ink text-white"
                        : "bg-mv-cream text-mv-ink-soft hover:text-mv-ink"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-mv-ink-faint">
                Aucun événement enregistré dans cette période ou ce filtre.
              </div>
            ) : (
              <div className="divide-y divide-mv-border-soft">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between text-xs hover:bg-mv-cream-soft/40 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
                        <Activity size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-mv-ink">{ev.label}</span>
                          <span className="rounded-full bg-mv-cream px-2 py-0.2 text-[10px] font-mono text-mv-ink-soft capitalize">
                            {ev.stage}
                          </span>
                        </div>
                        <div className="text-[11px] text-mv-ink-faint mt-0.5">
                          {ev.customerName ? (
                            <span>Client : <strong className="text-mv-ink-soft">{ev.customerName}</strong></span>
                          ) : (
                            <span>Visiteur anonyme / Action système</span>
                          )}
                          {Boolean(ev.metadata?.amountSpent) && (
                            <span className="ml-2 text-mv-green-dark font-semibold">
                              · Montant : {String(ev.metadata.amountSpent)} $
                            </span>
                          )}
                          {Boolean(ev.metadata?.rewardName) && (
                            <span className="ml-2 text-amber-700 font-medium">
                              · {String(ev.metadata.rewardName)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right font-mono text-[11px] text-mv-ink-faint">
                      {ev.formattedDate}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  kpi,
  icon: Icon,
  highlighted = false,
}: {
  kpi: RetentionKpi;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  highlighted?: boolean;
}) {
  const statusColor =
    kpi.status === "excellent"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : kpi.status === "good"
        ? "text-teal-700 bg-teal-50 border-teal-200"
        : kpi.status === "warning"
          ? "text-amber-800 bg-amber-50 border-amber-200"
          : "text-slate-600 bg-slate-50 border-slate-200";

  return (
    <Card
      className={`flex flex-col justify-between p-4 border transition-all ${
        highlighted
          ? "border-mv-green bg-gradient-to-b from-mv-surface to-mv-cream-soft shadow-sm ring-1 ring-mv-green/30"
          : "border-mv-border bg-mv-surface hover:shadow-xs"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-cream text-mv-ink-soft">
            <Icon size={14} />
          </div>
          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium font-mono ${statusColor}`}>
            {kpi.target}
          </span>
        </div>

        <h3 className="text-xs font-medium text-mv-ink-soft line-clamp-1 mb-1" title={kpi.label}>
          {kpi.label}
        </h3>

        <div className="font-serif text-2xl font-bold tracking-tight text-mv-ink font-mono mb-2">
          {kpi.formattedValue}
        </div>
      </div>

      <div className="border-t border-mv-border-soft pt-2 mt-1">
        <p className="text-[10.5px] leading-tight text-mv-ink-faint line-clamp-2" title={kpi.benchmarkNote}>
          {kpi.benchmarkNote}
        </p>
      </div>
    </Card>
  );
}
