"use client";


import { useTranslations, useLocale } from "next-intl";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { UnifiedTrendChart } from "@/components/charts/UnifiedTrendChart";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { MonthCalendar } from "@/components/charts/MonthCalendar";
import { LiveAlertsPanel } from "@/components/minerva/LiveAlertsPanel";
import { RecommendationsPanel } from "@/components/minerva/RecommendationsPanel";
import { WidgetManagerModal, useWidgetVisibility } from "@/components/minerva/WidgetManagerModal";
import { LiveKpiSync } from "@/components/realtime/LiveKpiSync";
import { cn, formatCurrency, formatDateFull } from "@/lib/utils";
import {
  CalendarCheck2,
  Megaphone,
  ArrowRight,
  SlidersHorizontal,
  Target,
  Users,
  Heart,
  DollarSign,
  Repeat,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
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
  todayLabel,
  revTrend,
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
  const locale = useLocale();
  const t = useTranslations("overviewView");
  const [managerOpen, setManagerOpen] = useState(false);
  const [reliabilityOpen, setReliabilityOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const { visibleWidgets, toggleWidget, resetWidgets, isVisible } = useWidgetVisibility();
  const router = useRouter();

  const isGroupMode = currentScope === "group";

  const now = useMemo(() => new Date(), []);
  const monthLabel = useMemo(() => {
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const full = formatDateFull(iso, locale);
    return full.charAt(0).toUpperCase() + full.slice(full.indexOf(" ") + 1);
  }, [now, locale]);

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
  const todayDateStr = (() => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Montreal",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
    } catch {
      return now.toISOString().slice(0, 10);
    }
  })();
  const matchedToday = serviceDays.find((d) => d.date === todayDateStr);
  const todayRevenue = matchedToday ? matchedToday.revenue : (serviceDays[0]?.revenue ?? 0);
  const laborPct = laborCost?.pct ?? kpiComparisons?.laborCost.currentPct ?? null;
  const retentionSales = incrementalRetentionRevenue ?? 0;

  return (
    <div className="space-y-6">
      <LiveKpiSync />

      {/* Page Header */}
      <PageHeader
        eyebrow={isGroupMode ? t("consolidatedGroupView") : t("operationalActionView")}
        title={
          isGroupMode
            ? t("consolidatedGroup", { count: restaurants.length })
            : firstName
            ? `${greeting}, ${firstName}`
            : greeting
        }
        description={
          isGroupMode ? (
            t("realTimeConsolidatedResults")
          ) : (
            <div className="space-y-1">
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {t("monthRevenueLine", { amount: formatCurrency(monthRevenue ?? 0, locale), date: todayLabel })}
                <span className="inline-flex items-center gap-1 rounded-full bg-mv-green-tint px-2 py-0.5 text-[12px] font-semibold text-mv-green-dark">
                  <Heart size={11} />
                  {incrementalRetentionRevenue && incrementalRetentionRevenue > 0
                    ? t("viaLoyalty", { amount: formatCurrency(incrementalRetentionRevenue, locale) })
                    : t("loyaltyActive")}
                </span>
              </span>
              {(!syncTelemetry || syncTelemetry.sourceType === "pending") && (
                <div className="flex items-center gap-1.5 text-[12px] text-mv-ink-faint">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-mv-amber" />
                  <span>{t("noRegisterConnected")}</span>
                  <Link
                    href="/integrations"
                    className="font-medium text-mv-green-dark hover:underline"
                  >
                    {t("connectACashRegister")}
                  </Link>
                </div>
              )}
            </div>
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
              <SlidersHorizontal size={14} /> {t("personalizeOverview")}
            </Button>
            <Button href="/days" variant="secondary" size="sm" className="hidden sm:inline-flex text-[12.5px]">
              <CalendarCheck2 size={14} /> {t("closeADay")}
            </Button>
          </div>
        }
      />

      {/* Guide de configuration / Fiabilité des données (accordéon replié par défaut) */}
      {onboardingReadiness && !onboardingReadiness.isFullyConfigured && onboardingReadiness.scorePct < 100 && (
        <div className="rounded-2xl border border-mv-border bg-mv-surface p-3 sm:p-4 shadow-mv-xs transition-all">
          <button
            type="button"
            onClick={() => setReliabilityOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
                <ShieldCheck size={15} />
              </div>
              <div>
                <span className="text-[13px] font-semibold text-mv-ink">
                  {t("setupGuide", { pct: onboardingReadiness.scorePct })}
                </span>
                <span className="ml-2 hidden text-[12px] text-mv-ink-faint sm:inline">
                  {t("finishYourRecipeSheets")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-mv-border-soft sm:block">
                <div
                  className="h-full bg-mv-green transition-all duration-500"
                  style={{ width: `${onboardingReadiness.scorePct}%` }}
                />
              </div>
              <ChevronDown
                size={16}
                className={cn("text-mv-ink-faint transition-transform duration-200", reliabilityOpen && "rotate-180")}
              />
            </div>
          </button>

          {reliabilityOpen && (
            <div className="mt-3.5 border-t border-mv-border-soft pt-3">
              <p className="text-[12px] leading-relaxed text-mv-ink-soft">
                {t("minervaFlowAutomaticallySyncs")}
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {onboardingReadiness.missingActions.slice(0, 3).map((act) => (
                  <div
                    key={act.id}
                    className="flex flex-col justify-between rounded-xl border border-mv-border-soft bg-mv-cream-soft/50 p-3"
                  >
                    <div>
                      <p className="text-[12.5px] font-semibold text-mv-ink">{act.title}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-mv-ink-soft">{act.description}</p>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* BANDE COMPACTE STATSTRIP (5 KPIs d'action sur une seule ligne condensée) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-mv-border bg-mv-surface p-3 shadow-mv-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 divide-y sm:grid-cols-2 sm:divide-y-0 sm:divide-x divide-mv-border-soft lg:grid-cols-5">
          {/* KPI 1 : Ventes nettes */}
          <div className="flex flex-col justify-between px-2 pt-2 first:pt-0 sm:pt-0 first:pl-0">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">{t("netSales")}</span>
              <DollarSign size={13} className="text-mv-green-dark" />
            </div>
            <div className="my-1.5">
              <p className="font-display text-[20px] font-semibold text-mv-ink leading-tight">
                {isGroupMode && multiEstablishmentRollup
                  ? formatCurrency(multiEstablishmentRollup.totalMonthRevenue, locale)
                  : formatCurrency(todayRevenue > 0 ? todayRevenue : (monthRevenue || 0), locale)}
              </p>
              {isGroupMode ? (
                <p className="text-[12px] text-mv-ink-soft mt-0.5">{t("groupTotalMonth")}</p>
              ) : kpiComparisons?.revenue.today.changePct != null ? (
                <p className="flex items-center gap-1 text-[12px] text-mv-ink-soft mt-0.5">
                  {kpiComparisons.revenue.today.direction === "up" ? (
                    <span className="flex items-center text-mv-green-dark font-semibold">
                      <ArrowUpRight size={12} />+{kpiComparisons.revenue.today.changePct}%
                    </span>
                  ) : (
                    <span className="flex items-center text-mv-amber font-semibold">
                      <ArrowDownRight size={12} />
                      {kpiComparisons.revenue.today.changePct}%
                    </span>
                  )}
                  <span>vs hier · Mois : {formatCurrency(monthRevenue || 0, locale)}</span>
                </p>
              ) : (
                <p className="text-[12px] text-mv-ink-soft mt-0.5">
                  Mois : {formatCurrency(monthRevenue || 0, locale)}
                </p>
              )}
            </div>
            <Link
              href="/days"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark hover:underline"
            >
              Ventes <ArrowRight size={11} />
            </Link>
          </div>

          {/* KPI 2 : Taux de retour (Fidélisation) */}
          <div className="flex flex-col justify-between px-2 pt-3 sm:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">{t("returnRate")}</span>
              <Repeat size={13} className="text-mv-green-dark" />
            </div>
            <div className="my-1.5">
              <p className="font-display text-[20px] font-semibold text-mv-ink leading-tight">
                {loyaltyHealth
                  ? `${Math.round(((loyaltyHealth.habitue + loyaltyHealth.privilegie + loyaltyHealth.ambassadeur) / Math.max(1, loyaltyHealth.habitue + loyaltyHealth.privilegie + loyaltyHealth.ambassadeur + loyaltyHealth.inactiveCount)) * 100)} %`
                  : "75 %"}
              </p>
              <p className="text-[12px] text-mv-ink-soft mt-0.5">
                {t("activeRegulars")} <strong>{loyaltyHealth ? loyaltyHealth.habitue + loyaltyHealth.privilegie + loyaltyHealth.ambassadeur : 15}</strong>
              </p>
            </div>
            <Link
              href="/fidelisation"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark hover:underline"
            >
              {t("loyaltyLink")} <ArrowRight size={11} />
            </Link>
          </div>

          {/* KPI 3 : Masse salariale */}
          <div className="flex flex-col justify-between px-2 pt-3 sm:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">{t("laborCost")}</span>
              <Users size={13} className="text-mv-ink-soft" />
            </div>
            <div className="my-1.5">
              <p className="font-display text-[20px] font-semibold text-mv-ink leading-tight">
                {isGroupMode && multiEstablishmentRollup
                  ? multiEstablishmentRollup.weightedLaborCostPct !== null
                    ? `${multiEstablishmentRollup.weightedLaborCostPct}%`
                    : "29.2%"
                  : laborPct !== null
                  ? `${laborPct}%`
                  : "—"}
              </p>
              <p className="text-[12px] text-mv-ink-soft mt-0.5">
                {t("targetLabel")} <strong>{t("targetValue")}</strong>
              </p>
            </div>
            <Link
              href="/horaire"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark hover:underline"
            >
              Horaires <ArrowRight size={11} />
            </Link>
          </div>

          {/* KPI 4 : Couverts & Seuil */}
          <div className="flex flex-col justify-between px-2 pt-3 sm:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">{t("coversThreshold")}</span>
              <Target size={13} className={dailyTarget?.reached ? "text-mv-green-dark" : "text-mv-amber"} />
            </div>
            <div className="my-1.5">
              <p className="font-display text-[20px] font-semibold text-mv-ink leading-tight">
                {isGroupMode && multiEstablishmentRollup
                  ? `${multiEstablishmentRollup.totalCoversToday} / ${multiEstablishmentRollup.totalDailyTargetNeeded}`
                  : `${dailyTarget?.clientsSoFar ?? 0} / ${dailyTarget?.clientsNeeded ?? 0}`}
              </p>
              <p className="text-[12px] text-mv-ink-soft mt-0.5">
                {dailyTarget?.reached ? "Point mort atteint !" : t("requiredToBeProfitable")}
              </p>
            </div>
            <Link
              href="/commandes"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark hover:underline"
            >
              Commandes <ArrowRight size={11} />
            </Link>
          </div>

          {/* KPI 5 : Fidélisation (LTV) */}
          <div className="flex flex-col justify-between px-2 pt-3 sm:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">{t("loyaltySales")}</span>
              <Heart size={13} className="text-mv-green-dark" />
            </div>
            <div className="my-1.5">
              <p className="font-display text-[20px] font-semibold text-mv-ink leading-tight">
                {isGroupMode && multiEstablishmentRollup
                  ? formatCurrency(multiEstablishmentRollup.totalRetentionRevenue, locale)
                  : formatCurrency(retentionSales, locale)}
              </p>
              <p className="text-[12px] text-mv-ink-soft mt-0.5">
                Impact relances 14j
              </p>
            </div>
            <Link
              href="/fidelisation"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-mv-green-dark hover:underline"
            >
              {t("loyaltyLink")} <ArrowRight size={11} />
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
            eyebrow={t("groupBenchmark")}
            title={t("performanceComparedByRestaurant")}
            description={t("analyzeGapsInMargin")}
          />

          <div className="space-y-2 md:hidden">
            {multiEstablishmentRollup.benchmarks.map((bench) => (
              <div key={bench.restaurantId} className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-mv-ink">{bench.name}</p>
                    <p className="text-[12px] text-mv-ink-faint">{bench.city} · {bench.posProvider}</p>
                  </div>
                  <Button size="sm" variant="secondary" href={`/overview?scope=${bench.restaurantId}`} className="shrink-0 text-[12px]">
                    Ouvrir
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                  <div><span className="text-mv-ink-faint">{t("salesMonth")}</span><p className="font-semibold text-mv-ink">{formatCurrency(bench.monthRevenue, locale)}</p></div>
                  <div><span className="text-mv-ink-faint">{t("salesDay")}</span><p className="font-semibold text-mv-ink">{formatCurrency(bench.todayRevenue, locale)}</p></div>
                  <div><span className="text-mv-ink-faint">{t("foodCost")}</span><p className={bench.foodCostPct <= 32 ? "font-semibold text-mv-green-dark" : "font-semibold text-mv-amber"}>{bench.foodCostPct}%</p></div>
                  <div><span className="text-mv-ink-faint">{t("coversThreshold2")}</span><p className="font-semibold text-mv-ink">{bench.coversToday} / {bench.dailyTargetNeeded}</p></div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-mv-border text-[12px] uppercase tracking-wider text-mv-ink-faint">
                  <th className="pb-3 font-semibold">{t("restaurant")}</th>
                  <th className="pb-3 font-semibold">{t("salesMonth")}</th>
                  <th className="pb-3 font-semibold">{t("salesDay")}</th>
                  <th className="pb-3 font-semibold">{t("ingredientCostFoodCost")}</th>
                  <th className="pb-3 font-semibold">{t("laborCost")}</th>
                  <th className="pb-3 font-semibold">{t("coversThreshold")}</th>
                  <th className="pb-3 font-semibold">{t("loyaltySales")}</th>
                  <th className="pb-3 font-semibold">{t("register")}</th>
                  <th className="pb-3 text-right font-semibold">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mv-border-soft">
                {multiEstablishmentRollup.benchmarks.map((bench) => (
                  <tr key={bench.restaurantId} className="hover:bg-mv-cream-soft/50">
                    <td className="py-3 font-semibold text-mv-ink">
                      <div>{bench.name}</div>
                      <span className="text-[12px] font-normal text-mv-ink-faint">{bench.city}</span>
                    </td>
                    <td className="py-3 font-medium text-mv-ink">{formatCurrency(bench.monthRevenue, locale)}</td>
                    <td className="py-3 text-mv-ink-soft">{formatCurrency(bench.todayRevenue, locale)}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-semibold ${
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
                      {formatCurrency(bench.retentionRevenue, locale)}
                    </td>
                    <td className="py-3 text-[12px] text-mv-ink-faint">
                      {bench.posProvider}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        href={`/overview?scope=${bench.restaurantId}`}
                        className="text-[12px]"
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
      {/* TREND CHART & CALENDRIER (Placés en priorité) */}
      {/* ========================================================================= */}
      {isVisible("widget-kpi-summary") && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="mv-animate-in lg:col-span-2">
            <Card className="h-full p-4 sm:p-5">
              <CardHeader
                eyebrow={t("revenueRetention")}
                title={t("dailySalesTrend")}
                description={t("trackDailyRevenueAnd")}
              />
              <UnifiedTrendChart
                series={[
                  { key: "revenu", slug: "revenu", label: "Chiffre d'affaires", color: "var(--mv-green)", data: revTrend },
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
                <p className="text-[12px] sm:text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  {t("serviceDays")}
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
                {t("viewClosingReports")}
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>

            <Link
              href="/campaigns"
              className="group mv-animate-in flex-1 rounded-2xl border border-mv-border bg-mv-surface p-4 sm:p-5 shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
            >
              <div className="flex items-start justify-between">
                <p className="text-[12px] sm:text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
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
              {activeCampaignsCount === 0 ? (
                <p className="mt-1 text-[12px] leading-snug text-mv-ink-faint">
                  {t("flowAmplifies")}{" "}
                  <span className="font-semibold text-mv-green-dark">{t("getStartedOrAsk")}</span>
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1 text-[12px] sm:text-[12.5px] font-semibold text-mv-green-dark">
                  {t("viewActiveCampaigns")}
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </p>
              )}
            </Link>
          </div>
        </div>
      )}

      {/* Month Calendar */}
      {isVisible("widget-heatmap") && (
        <div className="mv-animate-in">
          <Card className="p-4 sm:p-5">
            <CardHeader
              eyebrow={monthLabel}
              title={t("revenueCalendar")}
              description={t("clickADayTo")}
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

      {/* ========================================================================= */}
      {/* FLOW AI EXPLAINABLE RECOMMENDATIONS & LIVE ALERTS (Repositionnés tout en bas) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
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
