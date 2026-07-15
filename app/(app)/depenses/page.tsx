import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransactions } from "@/lib/data/finance";
import { isoDaysAgo, DEFAULT_HISTORY_WINDOW_DAYS } from "@/lib/utils";
import { DepensesView } from "./DepensesView";

export default async function DepensesPage() {
  const restaurantId = await getCurrentRestaurantId();
  const transactions = restaurantId
    ? await getFinancialTransactions(restaurantId, {
        from: isoDaysAgo(DEFAULT_HISTORY_WINDOW_DAYS),
        direction: "out",
      })
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Dépenses"
        title="Dépenses"
        description="Toutes vos sorties d'argent, séparées des revenus — cliquez une dépense pour son détail complet."
      />
      <DepensesView transactions={transactions} />
    </div>
  );
}
