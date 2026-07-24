import { OverviewClientView } from "@/components/minerva/OverviewClientView";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getMyProfile } from "@/lib/data/profile";
import { getPrograms } from "@/lib/data/programs";
import { getServiceDays } from "@/lib/data/service-days";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions, getConnections } from "@/lib/data/finance";
import { getAlertRules, getAlerts } from "@/lib/data/alerts";
import { revenueTrend, margeTrend, joursTrend, type ReportData } from "@/lib/reports";
import { computeAlerts } from "@/lib/engine/alerts";
import { computeRecommendations } from "@/lib/engine/recommendations";
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

  const [profile, serviceDays, programs, campaigns, financialTransactions, connections, alertRules, tableAlerts] =
    await Promise.all([
      getMyProfile(),
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

  const firstName = profile?.fullName?.split(" ")[0] ?? null;
  const monthMarge = margTrend.reduce((sum, d) => sum + d.revenue, 0);
  const todayLabel = formatDateFull(new Date().toISOString().slice(0, 10));
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

  const alerts = computeAlerts({ serviceDays, connections, alertRules, financialTransactions });
  const recommendations = computeRecommendations({ campaigns, programs, serviceDays, alerts });

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
    />
  );
}
