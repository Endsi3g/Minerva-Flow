import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransactions } from "@/lib/data/finance";
import { getRevenueByRestaurant } from "@/lib/data/service-days";
import { getEmployees } from "@/lib/data/employees";
import { getPrograms } from "@/lib/data/programs";
import { getTeamMembers } from "@/lib/data/team";
import { getPurchaseOrders } from "@/lib/data/purchase-orders";
import { getReservationsForDay } from "@/lib/data/reservations";
import { isoDaysAgo } from "@/lib/utils";
import { DataOverviewView } from "./DataOverviewView";
import { Store } from "lucide-react";

export default async function DataPage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return (
      <div>
        <PageHeader eyebrow="Données" title="Données" />
        <EmptyState
          icon={Store}
          title="Aucun restaurant configuré"
          description="Créez ou rejoignez un restaurant pour voir vos données."
          action={
            <Button href="/onboarding" size="sm">
              Configurer un restaurant
            </Button>
          }
        />
      </div>
    );
  }

  const historyFrom = isoDaysAgo(30);
  const inThirtyDays = new Date(Date.now() + 30 * 86_400_000).toISOString();

  const [revenueByRestaurant, transactions, employees, programs, members, purchaseOrders, upcomingReservations] =
    await Promise.all([
      getRevenueByRestaurant([restaurantId]),
      getFinancialTransactions(restaurantId, { from: historyFrom }),
      getEmployees(restaurantId),
      getPrograms(restaurantId),
      getTeamMembers(restaurantId),
      getPurchaseOrders(restaurantId),
      getReservationsForDay(restaurantId, new Date().toISOString(), inThirtyDays),
    ]);

  const expensesLast30d = transactions
    .filter((t) => t.direction === "out")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <DataOverviewView
      revenue={revenueByRestaurant[restaurantId] ?? { revenue: 0, delta: 0 }}
      expensesLast30d={expensesLast30d}
      activeEmployeeCount={employees.filter((e) => e.active).length}
      activeProgramCount={programs.filter((p) => p.status === "actif").length}
      memberCount={members.length}
      pendingPurchaseOrderCount={purchaseOrders.filter((o) => o.status === "brouillon" || o.status === "envoyee").length}
      upcomingReservationCount={upcomingReservations.length}
    />
  );
}
