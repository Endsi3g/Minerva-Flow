import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OverviewClientView } from "@/components/minerva/OverviewClientView";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getMyProfile } from "@/lib/data/profile";
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
import { revenueTrend, margeTrend, joursTrend, type ReportData } from "@/lib/reports";
import { computeAlerts } from "@/lib/engine/alerts";
import { computeRecommendations } from "@/lib/engine/recommendations";
import { computeBreakEven, BREAK_EVEN_DEFAULTS } from "@/lib/engine/break-even";
import { computeLaborCostPct, sumLaborCost } from "@/lib/engine/labor-cost";
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

export default async function OverviewPage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
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

  const { from, to, year, month } = currentMonthRange();
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekAheadIso = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const [
    profile,
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
  ] = await Promise.all([
    getMyProfile(),
    getRestaurant(restaurantId),
    getServiceDays(restaurantId, { from, to }),
    getPrograms(restaurantId),
    getCampaigns(restaurantId),
    getFinancialTransactions(restaurantId, { from, to }),
    getConnections(restaurantId),
    getAlertRules(restaurantId),
    getAlerts(restaurantId),
    getInventoryItems(restaurantId),
    getShiftSchedulesForRange(restaurantId, todayIso, weekAheadIso),
    getEmployees(restaurantId),
    getPurchaseOrders(restaurantId),
    getSuppliers(restaurantId),
  ]);

  const reportData: ReportData = { serviceDays, programs, campaigns, financialTransactions };

  const revTrend = revenueTrend(reportData);
  const margTrend = margeTrend(reportData);
  const joursTr = joursTrend(reportData);

  const firstName = profile?.fullName?.split(" ")[0] ?? null;
  const monthMarge = margTrend.reduce((sum, d) => sum + d.revenue, 0);
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
  const recommendations = computeRecommendations({
    campaigns,
    programs,
    serviceDays,
    alerts,
    laborCostPct: laborCost.pct,
  });

  // "Objectif du jour" — the daily client target from the Finance seuil de
  // rentabilité simulator (lib/engine/break-even.ts is the single source of
  // truth shared with BreakEvenSimulator), plus today's progress toward it
  // so Overview answers "how many customers do I need today" at a glance
  // per the product spec's principle #1.
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
    <OverviewClientView
      restaurantId={restaurantId}
      greeting={greeting}
      firstName={firstName}
      monthMarge={monthMarge}
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
    />
  );
}
