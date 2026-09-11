import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OverviewClientView } from "@/components/minerva/OverviewClientView";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentRestaurantId, getCurrentMembership } from "@/lib/data/current-restaurant";
import { getRestaurant, getUserRestaurants } from "@/lib/data/restaurants";
import { getMyProfile } from "@/lib/data/profile";
import { getMenuItems } from "@/lib/data/menu";
import { classifyMenuItems, getMarginDriftItems } from "@/lib/menu-engineering";
import { getLoyaltyTier, DEFAULT_LOYALTY_TIER_THRESHOLDS } from "@/lib/loyalty-tiers";
import { getInactiveCustomers, getUpcomingBirthdays } from "@/lib/engine/retention";
import { computeLtvImpact } from "@/lib/engine/impact";
import { getPrograms } from "@/lib/data/programs";
import { getServiceDays } from "@/lib/data/service-days";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions, getConnections } from "@/lib/data/finance";
import { getAlertRules, getAlerts } from "@/lib/data/alerts";
import { getInventoryItems } from "@/lib/data/inventory";
import { getShiftSchedulesForRange } from "@/lib/data/shift-schedules";
import { getEmployees } from "@/lib/data/employees";
import { getPurchaseOrders } from "@/lib/data/purchase-orders";
import { getSuppliers } from "@/lib/data/suppliers";
import { getCustomers } from "@/lib/data/customers";
import { getRetentionSends } from "@/lib/data/retention-sends";
import { revenueTrend, margeTrend, joursTrend, type ReportData } from "@/lib/reports";
import { computeAlerts } from "@/lib/engine/alerts";
import { computeRecommendations } from "@/lib/engine/recommendations";
import { computeBreakEven, BREAK_EVEN_DEFAULTS } from "@/lib/engine/break-even";
import { computeLaborCostPct, sumLaborCost } from "@/lib/engine/labor-cost";
import { getIncrementalRetentionRevenue } from "@/lib/engine/retention";
import { computeKpiComparisons, computeOnboardingReadiness } from "@/lib/engine/comparisons";
import { computeMultiEstablishmentRollup, type MultiEstablishmentRollup } from "@/lib/engine/multi-establishment";
import { getRestaurantSyncTelemetry } from "@/lib/data/sync-status";
import { formatDateFull } from "@/lib/utils";
import { Store } from "lucide-react";
import type { ServiceDay } from "@/lib/types";

const GREETINGS = ["Salutations", "Bonjour", "Allô", "Bon retour", "Bienvenue"];

function currentMonthRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month, 1).toISOString().slice(0, 10);
  const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { from, to, year, month };
}

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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("overview") };
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ scope?: string }>;
}) {
  const userRestaurants = await getUserRestaurants();
  const defaultRestaurantId = await getCurrentRestaurantId();

  if (!defaultRestaurantId && userRestaurants.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Vue globale" title="Aperçu" />
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

  const resolvedParams = searchParams ? await searchParams : {};
  const isMultiEstablishment = userRestaurants.length > 1;
  const isGroupScope = isMultiEstablishment && resolvedParams.scope === "group";
  const activeRestaurantId =
    !isGroupScope && resolvedParams.scope && userRestaurants.some((r) => r.id === resolvedParams.scope)
      ? resolvedParams.scope
      : defaultRestaurantId ?? userRestaurants[0].id;

  const { from, to, year, month } = currentMonthRange();
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekAheadIso = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  // Single or active restaurant data loading
  const [
    profile,
    membership,
    restaurant,
    serviceDays,
    programs,
    campaigns,
    financialTransactions,
    connections,
    alertRules,
    tableAlerts,
    inventoryItems,
    shiftSchedules,
    employees,
    purchaseOrders,
    suppliers,
    customers,
    retentionSends,
    retentionSendsAllTime,
    menuItems,
    syncTelemetry,
  ] = await Promise.all([
    getMyProfile(),
    getCurrentMembership(),
    getRestaurant(activeRestaurantId),
    getServiceDays(activeRestaurantId, { from, to }),
    getPrograms(activeRestaurantId),
    getCampaigns(activeRestaurantId),
    getFinancialTransactions(activeRestaurantId, { from, to }),
    getConnections(activeRestaurantId),
    getAlertRules(activeRestaurantId),
    getAlerts(activeRestaurantId),
    getInventoryItems(activeRestaurantId),
    getShiftSchedulesForRange(activeRestaurantId, todayIso, weekAheadIso),
    getEmployees(activeRestaurantId),
    getPurchaseOrders(activeRestaurantId),
    getSuppliers(activeRestaurantId),
    getCustomers(activeRestaurantId),
    getRetentionSends(activeRestaurantId, { from, to }),
    getRetentionSends(activeRestaurantId),
    getMenuItems(activeRestaurantId),
    getRestaurantSyncTelemetry(activeRestaurantId),
  ]);

  const isLtvFocusedRole = membership?.role === "owner" || membership?.role === "manager";
  const reportData: ReportData = { serviceDays, programs, campaigns, financialTransactions };

  const revTrend = revenueTrend(reportData);
  const margTrend = margeTrend(reportData);
  const joursTr = joursTrend(reportData);

  const firstName = profile?.fullName?.split(" ")[0] ?? null;
  const monthMarge = margTrend.reduce((sum, d) => sum + d.revenue, 0);
  const monthMargeIsEstimated = serviceDays.some((d) => d.expenses === undefined);
  const todayLabel = formatDateFull(todayIso);
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

  const alerts = computeAlerts({
    serviceDays,
    connections,
    alertRules,
    financialTransactions,
    inventoryItems,
    shiftSchedules,
    employees,
    purchaseOrders,
    suppliers,
  });
  const monthRevenue = serviceDays.reduce((sum, d) => sum + d.revenue, 0);
  const laborCost = computeLaborCostPct({ amount: sumLaborCost(financialTransactions), revenue: monthRevenue });

  // Break-even target
  const breakEvenAssumptions = {
    fixedCosts: restaurant?.breakEvenFixedCosts ?? BREAK_EVEN_DEFAULTS.fixedCosts,
    grossMarginPct: restaurant?.breakEvenGrossMarginPct ?? BREAK_EVEN_DEFAULTS.grossMarginPct,
    avgBasket: restaurant?.breakEvenAvgBasket ?? BREAK_EVEN_DEFAULTS.avgBasket,
  };
  const { dailyCoversNeeded } = computeBreakEven(breakEvenAssumptions);
  const todayRevenue = serviceDays.find((d) => d.date === todayIso)?.revenue ?? 0;
  const clientsSoFar = Math.round(todayRevenue / breakEvenAssumptions.avgBasket);
  const dailyTarget = {
    clientsNeeded: dailyCoversNeeded,
    clientsSoFar,
    reached: clientsSoFar >= dailyCoversNeeded,
  };

  const recommendations = computeRecommendations({
    campaigns,
    programs,
    serviceDays,
    alerts,
    laborCostPct: laborCost.pct,
  });

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
  const incrementalRetentionRevenue = getIncrementalRetentionRevenue(retentionSends, customers, 14);

  // LTV & Menu health
  let ltvImpact = null;
  let menuHealth = null;
  let loyaltyHealth = null;
  if (isLtvFocusedRole) {
    ltvImpact = computeLtvImpact(activeRestaurantId, customers, menuItems, retentionSendsAllTime);

    const classified = classifyMenuItems(menuItems);
    menuHealth = {
      etoile: classified.filter((i) => i.quadrant === "etoile" && i.active).length,
      chevalBataille: classified.filter((i) => i.quadrant === "cheval_bataille" && i.active).length,
      enigme: classified.filter((i) => i.quadrant === "enigme" && i.active).length,
      poidsMort: classified.filter((i) => i.quadrant === "poids_mort" && i.active).length,
      marginDriftCount: getMarginDriftItems(classified).length,
    };

    const tierThresholds = {
      tier2: restaurant?.loyaltyTier2Threshold ?? DEFAULT_LOYALTY_TIER_THRESHOLDS.tier2,
      tier3: restaurant?.loyaltyTier3Threshold ?? DEFAULT_LOYALTY_TIER_THRESHOLDS.tier3,
    };
    loyaltyHealth = {
      habitue: customers.filter((c) => getLoyaltyTier(c.totalSpent, tierThresholds) === "habitue").length,
      privilegie: customers.filter((c) => getLoyaltyTier(c.totalSpent, tierThresholds) === "privilegie").length,
      ambassadeur: customers.filter((c) => getLoyaltyTier(c.totalSpent, tierThresholds) === "ambassadeur").length,
      inactiveCount: getInactiveCustomers(customers, restaurant?.retentionInactivityDays ?? 21).length,
      upcomingBirthdaysCount: getUpcomingBirthdays(customers, restaurant?.retentionBirthdayLeadDays ?? 3).length,
    };
  }

  // System-wide Comparisons & Onboarding Readiness
  const kpiComparisons = computeKpiComparisons({
    todayIso,
    serviceDays,
    menuItems,
    currentLaborCostPct: laborCost.pct,
    incrementalRetentionCurrent: incrementalRetentionRevenue,
  });

  const onboardingReadiness = computeOnboardingReadiness({
    posConnectionCount: connections.length,
    posProvider: syncTelemetry.providerName,
    menuItems,
    serviceDaysCount: serviceDays.length,
    hasBreakEvenConfigured: Boolean(restaurant?.breakEvenFixedCosts),
    hasShiftSchedules: shiftSchedules.length > 0,
  });

  // Multi-establishment Rollup (if user manages 2+ establishments)
  let multiEstablishmentRollup: MultiEstablishmentRollup | null = null;
  if (isMultiEstablishment) {
    const dataByRestaurant = new Map();
    // Pre-populate active restaurant
    dataByRestaurant.set(activeRestaurantId, {
      serviceDays,
      menuItems,
      laborCostPct: laborCost.pct,
      todayIso,
      dailyCoversNeeded,
      retentionRevenue: incrementalRetentionRevenue,
      posProvider: syncTelemetry.providerName,
      posStatus: syncTelemetry.status === "synced" ? "connecte" : "attente",
    });

    // Fetch remaining restaurants summary
    const remaining = userRestaurants.filter((r) => r.id !== activeRestaurantId);
    await Promise.all(
      remaining.map(async (r) => {
        const [rDays, rItems, rCust, rSends, rTelemetry] = await Promise.all([
          getServiceDays(r.id, { from, to }),
          getMenuItems(r.id),
          getCustomers(r.id),
          getRetentionSends(r.id, { from, to }),
          getRestaurantSyncTelemetry(r.id),
        ]);
        const rRetention = getIncrementalRetentionRevenue(rSends, rCust, 14);
        dataByRestaurant.set(r.id, {
          serviceDays: rDays,
          menuItems: rItems,
          laborCostPct: 29.2, // standard fallback
          todayIso,
          dailyCoversNeeded: 42,
          retentionRevenue: rRetention,
          posProvider: rTelemetry.providerName,
          posStatus: rTelemetry.status === "synced" ? "connecte" : "attente",
        });
      })
    );

    multiEstablishmentRollup = computeMultiEstablishmentRollup({
      restaurants: userRestaurants,
      dataByRestaurant,
    });
  }

  return (
    <OverviewClientView
      restaurantId={activeRestaurantId}
      restaurants={userRestaurants}
      currentScope={isGroupScope ? "group" : activeRestaurantId}
      multiEstablishmentRollup={multiEstablishmentRollup}
      syncTelemetry={syncTelemetry}
      kpiComparisons={kpiComparisons}
      onboardingReadiness={onboardingReadiness}
      greeting={greeting}
      firstName={firstName}
      monthMarge={monthMarge}
      monthMargeIsEstimated={monthMargeIsEstimated}
      todayLabel={todayLabel}
      revTrend={revTrend}
      margTrend={margTrend}
      serviceDays={serviceDays}
      joursSparkData={joursSparkData}
      activeCampaignsCount={activeCampaigns.length}
      campagnesSparkData={campagnesSparkData}
      heat={heat}
      alerts={combinedAlerts}
      recommendations={recommendations}
      dailyTarget={dailyTarget}
      laborCost={laborCost}
      incrementalRetentionRevenue={incrementalRetentionRevenue}
      monthRevenue={monthRevenue}
      isLtvFocusedRole={isLtvFocusedRole}
      ltvImpact={ltvImpact}
      menuHealth={menuHealth}
      loyaltyHealth={loyaltyHealth}
    />
  );
}
