import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransactions, getExpenseCategories, getConnections } from "@/lib/data/finance";
import { getServiceDays } from "@/lib/data/service-days";
import { isoDaysAgo, DEFAULT_HISTORY_WINDOW_DAYS } from "@/lib/utils";
import { DataTabsView } from "./DataTabsView";
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

  const historyFrom = isoDaysAgo(DEFAULT_HISTORY_WINDOW_DAYS);
  const [transactions, expenseCategories, connections, serviceDays] = await Promise.all([
    getFinancialTransactions(restaurantId, { from: historyFrom }),
    getExpenseCategories(restaurantId),
    getConnections(restaurantId),
    getServiceDays(restaurantId, { from: historyFrom }),
  ]);

  return (
    <DataTabsView
      transactions={transactions}
      expenseCategories={expenseCategories}
      connections={connections}
      serviceDays={serviceDays}
    />
  );
}
