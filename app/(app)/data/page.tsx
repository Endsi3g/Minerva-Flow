import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransactions, getExpenseCategories, getConnections } from "@/lib/data/finance";
import { getServiceDays } from "@/lib/data/service-days";
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

  const [transactions, expenseCategories, connections, serviceDays] = await Promise.all([
    getFinancialTransactions(restaurantId),
    getExpenseCategories(restaurantId),
    getConnections(restaurantId),
    getServiceDays(restaurantId),
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
