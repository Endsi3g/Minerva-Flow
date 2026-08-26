"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { UnifiedTrendChart } from "@/components/charts/UnifiedTrendChart";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { MonthCalendar } from "@/components/charts/MonthCalendar";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { DistributionDonut } from "@/components/charts/DistributionDonut";
import { LiveAlertsPanel } from "@/components/minerva/LiveAlertsPanel";
import { RecommendationsPanel } from "@/components/minerva/RecommendationsPanel";
import { StartupChecklist } from "@/components/minerva/StartupChecklist";
import { WidgetManagerModal, useWidgetVisibility } from "@/components/minerva/WidgetManagerModal";
import { LiveKpiSync } from "@/components/realtime/LiveKpiSync";
import { HelperTooltip } from "@/components/ui/HelperTooltip";
import { formatCurrency, formatDateFull } from "@/lib/utils";
import {
  CalendarCheck2,
  Megaphone,
  ArrowRight,
  SlidersHorizontal,
  Target,
  CheckCircle2,
  Users,
  Heart,
  DollarSign,
  TrendingUp,
  Repeat,
  UtensilsCrossed,
  Cake,
} from "lucide-react";
import Link from "next/link";
import type { Alert, Recommendation, ServiceDay } from "@/lib/types";
import type { LaborCostResult } from "@/lib/engine/labor-cost";
import type { LtvImpact } from "@/lib/engine/impact";

type MenuHealth = {
  etoile: number;
  chevalBataille: number;
  enigme: number;
  poidsMort: number;
  marginDriftCount: number;
};

type LoyaltyHealth = {
  habitue: number;
  privilegie: number;
  ambassadeur: number;
  inactiveCount: number;
  upcomingBirthdaysCount: number;
};

export function OverviewClientView({
  restaurantId,
  greeting,
  firstName,
  monthMarge,
  monthMargeIsEstimated,
  todayLabel,
  revTrend,
  margTrend,
  serviceDays,
  joursSparkData,
  activeCampaignsCount,
  campagnesSparkData,
  heat,
  alerts,
  recommendations,
  dailyTarget,
  laborCost,
  incrementalRetentionRevenue,
  monthRevenue,
  isLtvFocusedRole,
  ltvImpact,
  menuHealth,
  loyaltyHealth,
}: {
  restaurantId: string;
  greeting: string;
  firstName: string | null;
  monthMarge: number;
  monthMargeIsEstimated: boolean;
  todayLabel: string;
  revTrend: { date: string; revenue: number }[];
  margTrend: { date: string; revenue: number }[];
  serviceDays: ServiceDay[];
  joursSparkData: { date: string; value: number }[];
  activeCampaignsCount: number;
  campagnesSparkData: { date: string; value: number }[];
  heat: { date: string; revenue: number; dow: number }[];
  alerts: Alert[];
  recommendations: Recommendation[];
  dailyTarget?: { clientsNeeded: number; clientsSoFar: number; reached: boolean };
  laborCost?: LaborCostResult;
  incrementalRetentionRevenue?: number;
  monthRevenue?: number;
  isLtvFocusedRole?: boolean;
  ltvImpact?: LtvImpact | null;
  menuHealth?: MenuHealth | null;
  loyaltyHealth?: LoyaltyHealth | null;
}) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const { visibleWidgets, toggleWidget, resetWidgets, isVisible } = useWidgetVisibility();
  const router = useRouter();

  const now = useMemo(() => new Date(), []);
  const monthLabel = useMemo(() => {
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const full = formatDateFull(iso);
    return full.charAt(0).toUpperCase() + full.slice(full.indexOf(" ") + 1);
  }, [now]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const d of serviceDays) if (d.events.length) map[d.date] = true;
    return map;
  }, [serviceDays]);

  function handleSelectDate(date: string) {
    if (date === selectedDate) {
      setSelectedDate(undefined);
    } else {
      router.push(`/days?date=${date}`);
    }
  }

  return (
    <div className="space-y-5">
      <LiveKpiSync restaurantId={restaurantId} />

      <PageHeader
        eyebrow="Vue globale"
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        description={
          <span className="inline-flex flex-wrap items-center gap-1">
            {`Voici votre marge cumulée du mois — ${formatCurrency(monthMarge)} au ${todayLabel}${monthMargeIsEstimated ? " (estimée)" : ""}.`}
            {monthMargeIsEstimated && (
              <HelperTooltip content="Vous n'avez pas encore entré de dépenses pour certaines journées — la marge de ces jours-là est estimée à 52,4 % du revenu plutôt que calculée sur vos vrais coûts. Ajoutez vos dépenses par journée pour un chiffre exact." />
            )}
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setManagerOpen(true)}
              className="text-[12.5px] whitespace-nowrap"
            >
              <SlidersHorizontal size={14} /> Personnaliser mes widgets
            </Button>
            <Button href="/days" variant="secondary" size="sm" className="hidden sm:inline-flex text-[12.5px]">
              <CalendarCheck2 size={14} /> Ajouter une journée
            </Button>
          </div>
        }
      />

      <StartupChecklist />

      {/* Owner/manager Overview is LTV-first (mirrors AppSidebar's role
          split): impact of menu engineering + rétention, then menu/loyalty
          health at a glance — replacing the generic finance/ops widgets
          below, which stay one click away in Gestion quotidienne /
          Performance & Analyse. Staff/consultant keep everything unchanged. */}
      {isLtvFocusedRole && ltvImpact && isVisible("widget-ltv-impact") && (
        <div className="mv-animate-in mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <button
            onClick={() => router.push("/impact")}
            className="group flex items-center gap-4 rounded-2xl border border-mv-border bg-mv-surface p-4 text-left shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md sm:p-5"
          >
            <RadialGauge
              value={monthRevenue ? (ltvImpact.incrementalRevenue / monthRevenue) * 100 : 0}
              color="var(--mv-green)"
              centerValue={`${monthRevenue ? Math.round((ltvImpact.incrementalRevenue / monthRevenue) * 100) : 0}%`}
              centerLabel="du mois"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                <DollarSign size={13} /> Ventes grâce à la fidélisation
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
                Achats en plus générés par vos relances automatiques, ce mois-ci.
              </p>
              <p className="mt-1 font-display text-[19px] font-medium text-mv-ink">
                {formatCurrency(ltvImpact.incrementalRevenue)}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-dark">
                Voir le détail
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push("/impact")}
            className="group flex items-center gap-4 rounded-2xl border border-mv-border bg-mv-surface p-4 text-left shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md sm:p-5"
          >
            <RadialGauge
              value={ltvImpact.activeMarginPct}
              color="var(--mv-green)"
              centerValue={`${ltvImpact.activeMarginPct.toFixed(0)}%`}
              centerLabel="de marge"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                <TrendingUp size={13} /> Marge du menu actif
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
                Marge de ce qui est au menu aujourd&apos;hui, vs le menu complet (plats retirés inclus).
              </p>
              <p className="mt-1 font-display text-[19px] font-medium text-mv-ink">
                {ltvImpact.marginGainPct >= 0 ? "+" : ""}
                {ltvImpact.marginGainPct.toFixed(1)} pt
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-dark">
                Voir le détail
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push("/impact")}
            className="group flex items-center gap-4 rounded-2xl border border-mv-border bg-mv-surface p-4 text-left shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md sm:p-5"
          >
            <RadialGauge
              value={
                ltvImpact.visitFrequency.hasEnoughSignal
                  ? (ltvImpact.visitFrequency.touchedPerMonth /
                      (ltvImpact.visitFrequency.touchedPerMonth + ltvImpact.visitFrequency.untouchedPerMonth || 1)) *
                    100
                  : 0
              }
              color="var(--mv-lime-dark)"
              centerValue={ltvImpact.visitFrequency.hasEnoughSignal ? `×${ltvImpact.visitFrequency.multiplier.toFixed(1)}` : "—"}
              centerLabel="plus souvent"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                <Repeat size={13} /> Clients qui reviennent plus souvent
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
                Clients touchés par une relance, comparés à ceux qui n&apos;en ont pas reçu.
              </p>
              {ltvImpact.visitFrequency.hasEnoughSignal ? (
                <p className="mt-1 text-[13px] text-mv-ink-soft">
                  {ltvImpact.visitFrequency.touchedPerMonth.toFixed(1)} visites/mois vs{" "}
                  {ltvImpact.visitFrequency.untouchedPerMonth.toFixed(1)}
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-mv-ink-faint">Pas encore assez de données</p>
              )}
              <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-dark">
                Voir le détail
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </div>
          </button>
        </div>
      )}

      {isLtvFocusedRole && (menuHealth || loyaltyHealth) && (
        <div className="mv-animate-in mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {menuHealth && isVisible("widget-menu-health") && (
            <Link
              href="/menu"
              className="group rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  <UtensilsCrossed size={13} /> Santé du menu
                </p>
                <ArrowRight size={14} className="text-mv-ink-faint transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mb-3 text-[11.5px] leading-snug text-mv-ink-faint">
                Répartition de vos plats par popularité et par rentabilité.
              </p>
              <DistributionDonut
                data={[
                  { label: "Étoiles", value: menuHealth.etoile, color: "var(--mv-green)" },
                  { label: "Chevaux de bataille", value: menuHealth.chevalBataille, color: "var(--mv-lime-dark)" },
                  { label: "Énigmes", value: menuHealth.enigme, color: "var(--mv-amber)" },
                  { label: "Poids morts", value: menuHealth.poidsMort, color: "var(--mv-red)" },
                ]}
              />
              {menuHealth.marginDriftCount > 0 && (
                <p className="mt-3 border-t border-mv-border-soft pt-3 text-[12px] font-medium text-mv-amber">
                  {menuHealth.marginDriftCount} plat{menuHealth.marginDriftCount > 1 ? "s" : ""} en dérive de marge
                </p>
              )}
            </Link>
          )}

          {loyaltyHealth && isVisible("widget-loyalty-health") && (
            <Link
              href="/fidelisation"
              className="group rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  <Heart size={13} /> Fidélisation en un coup d&apos;œil
                </p>
                <ArrowRight size={14} className="text-mv-ink-faint transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mb-3 text-[11.5px] leading-snug text-mv-ink-faint">
                Vos clients, classés par palier de fidélité selon leurs dépenses cumulées.
              </p>
              <DistributionDonut
                data={[
                  { label: "Habitués", value: loyaltyHealth.habitue, color: "var(--mv-ink-faint)" },
                  { label: "Privilégiés", value: loyaltyHealth.privilegie, color: "var(--mv-green)" },
                  { label: "Ambassadeurs", value: loyaltyHealth.ambassadeur, color: "var(--mv-lime-dark)" },
                ]}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-mv-border-soft pt-3 text-[12px] text-mv-ink-soft">
                <span>{loyaltyHealth.inactiveCount} client(s) inactif(s)</span>
                {loyaltyHealth.upcomingBirthdaysCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Cake size={12} /> {loyaltyHealth.upcomingBirthdaysCount} anniversaire(s) à venir
                  </span>
                )}
              </div>
            </Link>
          )}
        </div>
      )}

      {!isLtvFocusedRole && (
      <>
      {/* "Objectif du jour" — the daily break-even client target computed from
          the Finance seuil de rentabilité simulator (lib/engine/break-even.ts),
          with today's progress toward it. The single most important number on
          this page per the product spec: "il te faut N clients pour être
          payé". Links to /commandes (take action) and /finance (adjust the
          assumptions behind the number). */}
      {dailyTarget && isVisible("widget-daily-target") && (
        <div className="mv-animate-in mb-6 rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                  dailyTarget.reached
                    ? "border-mv-green/20 bg-mv-green-tint text-mv-green-dark"
                    : "border-mv-amber/20 bg-mv-amber-bg text-mv-amber"
                }`}
              >
                {dailyTarget.reached ? <CheckCircle2 size={22} /> : <Target size={22} />}
              </div>
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  Objectif du jour
                </p>
                <p className="mt-0.5 font-display text-[19px] font-medium leading-snug text-mv-ink">
                  {`Il te faut ${dailyTarget.clientsNeeded} client${dailyTarget.clientsNeeded > 1 ? "s" : ""} aujourd'hui pour être payé`}
                </p>
                <p className="mt-0.5 text-[12.5px] text-mv-ink-soft">
                  {`${dailyTarget.clientsSoFar} / ${dailyTarget.clientsNeeded} atteints jusqu'à maintenant`}
                  {dailyTarget.reached ? " — objectif atteint !" : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:pl-2">
              <Button href="/commandes" size="sm" className="text-[12.5px] whitespace-nowrap">
                Prendre une commande
              </Button>
              <Button href="/finance" variant="secondary" size="sm" className="text-[12.5px] whitespace-nowrap">
                Ajuster mes hypothèses
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* "Masse salariale" — labor cost as % of this month's CA, from
          lib/engine/labor-cost.ts (single source of truth shared with
          Finance's Aperçu tab). Amber when over the industry-benchmark
          target so a real overage reads as a warning, not just a number;
          the concrete fix action lives in Horaire. */}
      {laborCost && isVisible("widget-labor-cost") && (
        <div className="mv-animate-in mb-6 rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                  laborCost.withinTarget === false
                    ? "border-mv-amber/20 bg-mv-amber-bg text-mv-amber"
                    : "border-mv-ink/10 bg-mv-ink/[0.06] text-mv-ink-soft"
                }`}
              >
                <Users size={22} />
              </div>
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  Masse salariale du mois
                </p>
                <p className="mt-0.5 font-display text-[19px] font-medium leading-snug text-mv-ink">
                  {laborCost.pct !== null ? `${laborCost.pct}% du chiffre d'affaires` : "—"}
                </p>
                <p className="mt-0.5 text-[12.5px] text-mv-ink-soft">
                  {laborCost.pct !== null
                    ? `Cible ≤ 30% du CA${laborCost.withinTarget === false ? " — au-dessus de la cible" : ""}`
                    : "Aucune donnée de main-d'œuvre ce mois-ci"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:pl-2">
              <Button href="/horaire" variant="secondary" size="sm" className="text-[12.5px] whitespace-nowrap">
                Voir les horaires
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* "Revenu incrémental — fidélisation" — the concrete $ number behind
          the LTV pitch: revenue from visits that landed within 14 days of an
          automated retention nudge (lib/engine/retention.ts). Always shown
          (even at 0$) so activating the toggle in /fidelisation has a
          visible payoff to watch grow. */}
      {incrementalRetentionRevenue !== undefined && isVisible("widget-incremental-revenue") && (
        <div className="mv-animate-in mb-6 rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-mv-green/20 bg-mv-green-tint text-mv-green-dark">
                <Heart size={22} />
              </div>
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  Revenu incrémental — fidélisation
                </p>
                <p className="mt-0.5 font-display text-[19px] font-medium leading-snug text-mv-ink">
                  {formatCurrency(incrementalRetentionRevenue)} ce mois-ci
                </p>
                <p className="mt-0.5 text-[12.5px] text-mv-ink-soft">
                  Visites survenues dans les 14 jours suivant une relance automatique (inactivité, anniversaire, décrochage)
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:pl-2">
              <Button href="/fidelisation" variant="secondary" size="sm" className="text-[12.5px] whitespace-nowrap">
                Voir la fidélisation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Trend Chart & Summary Cards Widget */}
      {isVisible("widget-kpi-summary") && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="mv-animate-in lg:col-span-2">
            <Card className="h-full p-4 sm:p-5">
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
              className="group mv-animate-in flex-1 rounded-2xl border border-mv-border bg-mv-surface p-4 sm:p-5 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
            >
              <div className="flex items-start justify-between">
                <p className="text-[11.5px] sm:text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  Journées de service
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mv-ink/[0.06] text-mv-ink-soft">
                  <CalendarCheck2 size={16} strokeWidth={2.2} />
                </div>
              </div>
              <p className="mt-2 sm:mt-3 font-display text-[24px] sm:text-[28px] font-medium leading-none text-mv-ink">
                {serviceDays.length}
              </p>
              <div className="mt-2">
                <MiniSparkline id="jours" data={joursSparkData} color="var(--mv-amber)" />
              </div>
              <p className="mt-1 flex items-center gap-1 text-[12px] sm:text-[12.5px] font-semibold text-mv-green-dark">
                Voir le rapport
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>

            <Link
              href="/reports/campagnes"
              className="group mv-animate-in flex-1 rounded-2xl border border-mv-border bg-mv-surface p-4 sm:p-5 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
            >
              <div className="flex items-start justify-between">
                <p className="text-[11.5px] sm:text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  Campagnes actives
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mv-ink/[0.06] text-mv-ink-soft">
                  <Megaphone size={16} strokeWidth={2.2} />
                </div>
              </div>
              <p className="mt-2 sm:mt-3 font-display text-[24px] sm:text-[28px] font-medium leading-none text-mv-ink">
                {activeCampaignsCount}
              </p>
              <div className="mt-2">
                <MiniSparkline id="campagnes" data={campagnesSparkData} color="var(--mv-green)" />
              </div>
              <p className="mt-1 flex items-center gap-1 text-[12px] sm:text-[12.5px] font-semibold text-mv-green-dark">
                Voir les campagnes
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* Month Calendar Widget */}
      {isVisible("widget-heatmap") && (
        <div className="mb-6 mv-animate-in">
          <Card className="p-4 sm:p-5">
            <CardHeader
              eyebrow={monthLabel}
              title="Calendrier des revenus"
              description="Cliquez sur un jour pour accéder au détail de cette journée."
            />
            <MonthCalendar
              data={heat}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              eventsByDate={eventsByDate}
            />
          </Card>
        </div>
      )}
      </>
      )}

      {/* Alerts & Recommendations Widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isVisible("widget-alerts") && (
          <div className="mv-animate-in">
            <LiveAlertsPanel restaurantId={restaurantId} initial={alerts} />
          </div>
        )}
        {isVisible("widget-recommendations") && (
          <div className="mv-animate-in">
            <RecommendationsPanel initial={recommendations} />
          </div>
        )}
      </div>

      <WidgetManagerModal
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        visibleWidgets={visibleWidgets}
        onToggle={toggleWidget}
        onReset={resetWidgets}
      />
    </div>
  );
}
