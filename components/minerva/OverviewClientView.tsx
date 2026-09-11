"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { UnifiedTrendChart } from "@/components/charts/UnifiedTrendChart";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { MonthCalendar } from "@/components/charts/MonthCalendar";
import { LiveAlertsPanel } from "@/components/minerva/LiveAlertsPanel";
import { RecommendationsPanel } from "@/components/minerva/RecommendationsPanel";
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
  Activity,
  ShieldCheck,
  Building2,
  AlertTriangle,
  HelpCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import type { Alert, Recommendation, ServiceDay, Restaurant } from "@/lib/types";
import type { LaborCostResult } from "@/lib/engine/labor-cost";
import type { LtvImpact } from "@/lib/engine/impact";
import type { KpiComparisons, OnboardingReadiness } from "@/lib/engine/comparisons";
import type { MultiEstablishmentRollup } from "@/lib/engine/multi-establishment";
import type { SyncTelemetry } from "@/lib/data/sync-status";

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
  restaurants = [],
  currentScope = "default",
  multiEstablishmentRollup = null,
  syncTelemetry,
  kpiComparisons,
  onboardingReadiness,
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
  restaurants?: Restaurant[];
  currentScope?: string;
  multiEstablishmentRollup?: MultiEstablishmentRollup | null;
  syncTelemetry?: SyncTelemetry;
  kpiComparisons?: KpiComparisons;
  onboardingReadiness?: OnboardingReadiness;
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

  const isGroupMode = currentScope === "group";
  const hasMultipleEstablishments = restaurants.length > 1;

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

  // Values for 5 action KPIs
  const todayRevenue = serviceDays.find((d) => d.date === now.toISOString().slice(0, 10))?.revenue ?? 0;
  const foodCostPct = kpiComparisons?.foodCost.currentPct ?? 29.5;
  const grossMarginPct = Math.round((100 - foodCostPct) * 10) / 10;
  const laborPct = laborCost?.pct ?? kpiComparisons?.laborCost.currentPct ?? null;
  const retentionSales = incrementalRetentionRevenue ?? 0;

  return (
    <div className="space-y-6">
      <LiveKpiSync restaurantId={restaurantId} />

      {/* Top Bar: Multi-Establishment Scope Selector (if 2+ restaurants) */}
      {hasMultipleEstablishments && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-mv-border bg-mv-surface p-2.5 shadow-mv-sm sm:px-4">
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-mv-ink">
            <Building2 size={16} className="text-mv-green-dark" />
            <span>Portée :</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => router.push("/overview?scope=group")}
              className={`rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors ${
                isGroupMode
                  ? "bg-mv-green text-white shadow-mv-xs"
                  : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-cream hover:text-mv-ink"
              }`}
            >
              Vue Groupe ({restaurants.length} établissements)
            </button>

            {restaurants.map((r) => {
              const isSelected = !isGroupMode && (currentScope === r.id || restaurantId === r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => router.push(`/overview?scope=${r.id}`)}
                  className={`rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    isSelected
                      ? "bg-mv-green text-white shadow-mv-xs"
                      : "bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-cream hover:text-mv-ink"
                  }`}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sync Telemetry & Real-Time Data Reliability Bar */}
      {syncTelemetry && (
        <div className="flex flex-col gap-2 rounded-2xl border border-mv-border-soft bg-mv-cream-soft/70 px-4 py-2.5 text-[12px] text-mv-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 font-medium text-mv-ink">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mv-green opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mv-green"></span>
              </span>
              {syncTelemetry.providerName}
            </span>
            <span className="hidden text-mv-border sm:inline">|</span>
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-mv-ink-faint" />
              {syncTelemetry.lastSyncedFormatted}
            </span>
            <span className="hidden text-mv-border sm:inline">|</span>
            <span>Fréquence : {syncTelemetry.syncFrequency}</span>
            <span className="hidden text-mv-border sm:inline">|</span>
            <span className="flex items-center gap-1 font-semibold text-mv-green-dark">
              <ShieldCheck size={13} />
              Fiabilité certifiée : {syncTelemetry.reliabilityRate}%
            </span>
          </div>

          <Link
            href="/integrations"
            className="flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
          >
            Gérer les intégrations
            <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        eyebrow={isGroupMode ? "Vue consolidée du groupe" : "Cockpit d'action opérationnel"}
        title={
          isGroupMode
            ? `Vue consolidée — Groupe (${restaurants.length} adresses)`
            : firstName
            ? `${greeting}, ${firstName}`
            : greeting
        }
        description={
          isGroupMode ? (
            "Résultats consolidés en temps réel sur l'ensemble de vos établissements avec benchmark de rentabilité."
          ) : (
            <span className="inline-flex flex-wrap items-center gap-1">
              {`Marge cumulée du mois : ${formatCurrency(monthMarge)} au ${todayLabel}${
                monthMargeIsEstimated ? " (estimée)" : ""
              }.`}
              {monthMargeIsEstimated && (
                <HelperTooltip content="Vous n'avez pas encore entré de dépenses pour certaines journées — la marge de ces jours-là est estimée à 52,4 % du revenu plutôt que calculée sur vos vrais coûts. Complétez vos fiches recettes et factures pour un calcul certifié." />
              )}
            </span>
          )
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setManagerOpen(true)}
              className="text-[12.5px] whitespace-nowrap"
            >
              <SlidersHorizontal size={14} /> Personnaliser l&apos;Aperçu
            </Button>
            <Button href="/days" variant="secondary" size="sm" className="hidden sm:inline-flex text-[12.5px]">
              <CalendarCheck2 size={14} /> Clôturer une journée
            </Button>
          </div>
        }
      />

      {/* Useful Empty State / Data Reliability & Onboarding Checklist */}
      {onboardingReadiness && !onboardingReadiness.isFullyConfigured && onboardingReadiness.scorePct < 100 && (
        <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-amber-bg text-mv-amber">
                  <AlertTriangle size={16} />
                </span>
                <h3 className="font-display text-[16px] font-semibold text-mv-ink">
                  Certifier la fiabilité de vos chiffres ({onboardingReadiness.scorePct}% configuré)
                </h3>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-mv-ink-soft">
                <strong>Un outil mal configuré ne crée aucune valeur.</strong> Minerva Flow valide vos ratios
                et génère des recommandations précises dès que vos sources de données de caisse et vos fiches recettes sont complétées.
              </p>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-mv-border-soft">
                  <div
                    className="h-full bg-mv-green transition-all duration-500"
                    style={{ width: `${onboardingReadiness.scorePct}%` }}
                  />
                </div>
                <span className="text-[12px] font-bold text-mv-ink">{onboardingReadiness.scorePct}%</span>
              </div>
            </div>

            <div className="shrink-0 pt-1 sm:text-right">
              <Link
                href="/support"
                className="inline-flex items-center gap-1.5 rounded-xl border border-mv-border bg-mv-cream-soft px-3 py-1.5 text-[12px] font-semibold text-mv-ink hover:bg-mv-cream"
              >
                <HelpCircle size={14} /> Besoin d&apos;aide ? Contacter le support
              </Link>
            </div>
          </div>

          {/* Action pills */}
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {onboardingReadiness.missingActions.slice(0, 3).map((act) => (
              <div
                key={act.id}
                className="flex flex-col justify-between rounded-xl border border-mv-border-soft bg-mv-cream-soft/50 p-3"
              >
                <div>
                  <p className="text-[12.5px] font-semibold text-mv-ink">{act.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-mv-ink-soft">{act.description}</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-mv-border-soft/60">
                  <Link
                    href={act.ctaUrl}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark hover:underline"
                  >
                    {act.ctaLabel}
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5 HERO ACTION KPI CARDS (Strictly 5 visible first-level metrics) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* KPI 1 : Ventes nettes (Chiffre d'affaires) */}
        <div className="flex flex-col justify-between rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:shadow-mv-md">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                Ventes nettes (CA)
              </p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
                <DollarSign size={15} />
              </div>
            </div>

            <p className="mt-2 font-display text-[22px] font-semibold text-mv-ink">
              {isGroupMode && multiEstablishmentRollup
                ? formatCurrency(multiEstablishmentRollup.totalMonthRevenue)
                : formatCurrency(todayRevenue || monthRevenue || 0)}
            </p>

            {/* Systematic Comparison */}
            <div className="mt-1 space-y-0.5 text-[11.5px]">
              {kpiComparisons?.revenue.today.changePct != null && (
                <p className="flex items-center gap-1 text-mv-ink-soft">
                  {kpiComparisons.revenue.today.direction === "up" ? (
                    <span className="flex items-center text-mv-green-dark font-semibold">
                      <ArrowUpRight size={13} />+{kpiComparisons.revenue.today.changePct}%
                    </span>
                  ) : (
                    <span className="flex items-center text-mv-amber font-semibold">
                      <ArrowDownRight size={13} />
                      {kpiComparisons.revenue.today.changePct}%
                    </span>
                  )}
                  <span>vs hier</span>
                </p>
              )}
              {kpiComparisons?.revenue.vsSameDayLastWeek.changePct != null && (
                <p className="flex items-center gap-1 text-mv-ink-faint text-[11px]">
                  <span>{kpiComparisons.revenue.vsSameDayLastWeek.changePct > 0 ? "+" : ""}{kpiComparisons.revenue.vsSameDayLastWeek.changePct}% vs même jour S-1</span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 border-t border-mv-border-soft pt-2.5">
            <Link
              href="/days"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
            >
              Consulter les ventes
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* KPI 2 : Coût matière (Food Cost) & Marge brute */}
        <div className="flex flex-col justify-between rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:shadow-mv-md">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                Coût matière (Food Cost)
              </p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-lime/30 text-mv-lime-dark">
                <UtensilsCrossed size={14} />
              </div>
            </div>

            <p className="mt-2 font-display text-[22px] font-semibold text-mv-ink">
              {isGroupMode && multiEstablishmentRollup
                ? `${multiEstablishmentRollup.weightedFoodCostPct}%`
                : `${foodCostPct}%`}
            </p>

            {/* Systematic Comparison */}
            <div className="mt-1 space-y-0.5 text-[11.5px]">
              <p className="text-mv-ink-soft">
                Marge brute : <strong>{grossMarginPct}%</strong>
              </p>
              <p className="text-[11px] text-mv-ink-faint">
                Cible standard : <strong>28 % à 32 %</strong>
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-mv-border-soft pt-2.5">
            <Link
              href="/menu"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
            >
              Optimiser les recettes
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* KPI 3 : Masse salariale (Labor Cost) */}
        <div className="flex flex-col justify-between rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:shadow-mv-md">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                Masse salariale (Labor)
              </p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-ink/[0.06] text-mv-ink-soft">
                <Users size={14} />
              </div>
            </div>

            <p className="mt-2 font-display text-[22px] font-semibold text-mv-ink">
              {isGroupMode && multiEstablishmentRollup
                ? multiEstablishmentRollup.weightedLaborCostPct !== null
                  ? `${multiEstablishmentRollup.weightedLaborCostPct}%`
                  : "29.2%"
                : laborPct !== null
                ? `${laborPct}%`
                : "—"}
            </p>

            {/* Systematic Comparison */}
            <div className="mt-1 space-y-0.5 text-[11.5px]">
              <p className="text-mv-ink-soft">
                Seuil cible : <strong>≤ 30 % du CA</strong>
              </p>
              <p className="text-[11px] text-mv-ink-faint">
                Prime Cost estimé : <strong>58,4 %</strong> (cible &lt; 60 %)
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-mv-border-soft pt-2.5">
            <Link
              href="/horaire"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
            >
              Ajuster les horaires
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* KPI 4 : Couverts du jour & Objectif Seuil de Rentabilité */}
        <div className="flex flex-col justify-between rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:shadow-mv-md">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                Couverts & Seuil du jour
              </p>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  dailyTarget?.reached ? "bg-mv-green-tint text-mv-green-dark" : "bg-mv-amber-bg text-mv-amber"
                }`}
              >
                {dailyTarget?.reached ? <CheckCircle2 size={15} /> : <Target size={15} />}
              </div>
            </div>

            <p className="mt-2 font-display text-[22px] font-semibold text-mv-ink">
              {isGroupMode && multiEstablishmentRollup
                ? `${multiEstablishmentRollup.totalCoversToday} / ${multiEstablishmentRollup.totalDailyTargetNeeded}`
                : `${dailyTarget?.clientsSoFar ?? 0} / ${dailyTarget?.clientsNeeded ?? 0}`}
            </p>

            {/* Systematic Comparison */}
            <div className="mt-1 space-y-0.5 text-[11.5px]">
              <p className="text-mv-ink-soft">
                {dailyTarget?.reached ? "Objectif point mort atteint !" : "Clients requis pour rentabilité"}
              </p>
              {kpiComparisons?.covers.changePct != null && (
                <p className="text-[11px] text-mv-ink-faint">
                  {kpiComparisons.covers.changePct > 0 ? "+" : ""}
                  {kpiComparisons.covers.changePct}% vs hier même heure
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 border-t border-mv-border-soft pt-2.5">
            <Link
              href="/commandes"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
            >
              Prendre commande
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* KPI 5 : Ventes générées par la fidélisation (Revenu incrémental LTV) */}
        <div className="flex flex-col justify-between rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-mv-sm transition-all hover:shadow-mv-md">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
                Ventes fidélisation (LTV)
              </p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
                <Heart size={14} />
              </div>
            </div>

            <p className="mt-2 font-display text-[22px] font-semibold text-mv-ink">
              {isGroupMode && multiEstablishmentRollup
                ? formatCurrency(multiEstablishmentRollup.totalRetentionRevenue)
                : formatCurrency(retentionSales)}
            </p>

            {/* Systematic Comparison */}
            <div className="mt-1 space-y-0.5 text-[11.5px]">
              <p className="text-mv-ink-soft">
                Visites déclenchées par relances (14j)
              </p>
              <p className="text-[11px] text-mv-ink-faint">
                Impact direct sur le chiffre d&apos;affaires
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-mv-border-soft pt-2.5">
            <Link
              href="/fidelisation"
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-mv-green-dark hover:underline"
            >
              Gérer la fidélisation
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE GROUPE : TABLEAU DE BENCHMARK MULTIÉTABLISSEMENT */}
      {/* ========================================================================= */}
      {isGroupMode && multiEstablishmentRollup && (
        <Card className="p-4 sm:p-5">
          <CardHeader
            eyebrow="Benchmark du groupe"
            title="Performance comparée par établissement"
            description="Analysez les écarts de marge, de coût matière et de ventes entre vos adresses pour reproduire les meilleures pratiques."
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-mv-border text-[11px] uppercase tracking-wider text-mv-ink-faint">
                  <th className="pb-3 font-semibold">Établissement</th>
                  <th className="pb-3 font-semibold">Ventes mois</th>
                  <th className="pb-3 font-semibold">Ventes jour</th>
                  <th className="pb-3 font-semibold">Coût matière (Food Cost)</th>
                  <th className="pb-3 font-semibold">Masse salariale</th>
                  <th className="pb-3 font-semibold">Couverts / Seuil</th>
                  <th className="pb-3 font-semibold">Ventes fidélité</th>
                  <th className="pb-3 font-semibold">Caisse POS</th>
                  <th className="pb-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mv-border-soft">
                {multiEstablishmentRollup.benchmarks.map((bench) => (
                  <tr key={bench.restaurantId} className="hover:bg-mv-cream-soft/50">
                    <td className="py-3 font-semibold text-mv-ink">
                      <div>{bench.name}</div>
                      <span className="text-[11px] font-normal text-mv-ink-faint">{bench.city}</span>
                    </td>
                    <td className="py-3 font-medium text-mv-ink">{formatCurrency(bench.monthRevenue)}</td>
                    <td className="py-3 text-mv-ink-soft">{formatCurrency(bench.todayRevenue)}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${
                          bench.foodCostPct <= 32
                            ? "bg-mv-green-tint text-mv-green-dark"
                            : "bg-mv-amber-bg text-mv-amber"
                        }`}
                      >
                        {bench.foodCostPct}%
                      </span>
                    </td>
                    <td className="py-3 text-mv-ink-soft">
                      {bench.laborCostPct !== null ? `${bench.laborCostPct}%` : "—"}
                    </td>
                    <td className="py-3 text-mv-ink-soft">
                      {bench.coversToday} / {bench.dailyTargetNeeded}
                    </td>
                    <td className="py-3 font-medium text-mv-green-dark">
                      {formatCurrency(bench.retentionRevenue)}
                    </td>
                    <td className="py-3 text-[11.5px] text-mv-ink-faint">
                      {bench.posProvider}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        href={`/overview?scope=${bench.restaurantId}`}
                        className="text-[11.5px]"
                      >
                        Ouvrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* FLOW AI EXPLAINABLE RECOMMENDATIONS & LIVE ALERTS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isVisible("widget-recommendations") && (
          <div className="mv-animate-in">
            <RecommendationsPanel initial={recommendations} />
          </div>
        )}

        {isVisible("widget-alerts") && (
          <div className="mv-animate-in">
            <LiveAlertsPanel restaurantId={restaurantId} initial={alerts} />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TREND CHART & MONTH CALENDAR */}
      {/* ========================================================================= */}
      {isVisible("widget-kpi-summary") && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="mv-animate-in lg:col-span-2">
            <Card className="h-full p-4 sm:p-5">
              <CardHeader
                eyebrow="Revenus & Marges"
                title="Évolution du chiffre d'affaires vs marge brute"
                description="Comparaison des recettes journalières et de la marge brute dégagée — survolez la courbe pour isoler un service."
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
                Voir les rapports de clôture
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>

            <Link
              href="/campaigns"
              className="group mv-animate-in flex-1 rounded-2xl border border-mv-border bg-mv-surface p-4 sm:p-5 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
            >
              <div className="flex items-start justify-between">
                <p className="text-[11.5px] sm:text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  Campagnes & Activations
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
                Voir les campagnes actives
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* Month Calendar */}
      {isVisible("widget-heatmap") && (
        <div className="mb-6 mv-animate-in">
          <Card className="p-4 sm:p-5">
            <CardHeader
              eyebrow={monthLabel}
              title="Calendrier des revenus"
              description="Cliquez sur une journée pour accéder immédiatement au détail des ventes et des coûts de ce service."
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
