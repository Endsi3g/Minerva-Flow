import { LiveKpiSync } from "@/components/realtime/LiveKpiSync";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransactions, getExpenseCategories, getConnections } from "@/lib/data/finance";
import { getRestaurant } from "@/lib/data/restaurants";
import { FinanceView } from "./FinanceView";

export default async function FinancePage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return <FinanceView transactions={[]} expenseCategories={[]} connections={[]} />;
  }

  const [transactions, expenseCategories, connections, restaurant] = await Promise.all([
    getFinancialTransactions(restaurantId),
    getExpenseCategories(restaurantId),
    getConnections(restaurantId),
    getRestaurant(restaurantId),
  ]);

  return (
    <>
      <LiveKpiSync restaurantId={restaurantId} />
      <FinanceView
        transactions={transactions}
        expenseCategories={expenseCategories}
        connections={connections}
        breakEvenSettings={{
          fixedCosts: restaurant?.breakEvenFixedCosts ?? null,
          grossMarginPct: restaurant?.breakEvenGrossMarginPct ?? null,
          avgBasket: restaurant?.breakEvenAvgBasket ?? null,
        }}
      />
    </>
  );
}
