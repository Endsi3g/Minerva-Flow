import { LiveKpiSync } from "@/components/realtime/LiveKpiSync";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransactions, getExpenseCategories, getConnections } from "@/lib/data/finance";
import { getRestaurant } from "@/lib/data/restaurants";
import { getServiceDays } from "@/lib/data/service-days";
import { FinanceView } from "./FinanceView";

function currentMonthRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month, 1).toISOString().slice(0, 10);
  const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export default async function FinancePage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return <FinanceView transactions={[]} expenseCategories={[]} connections={[]} serviceDays={[]} />;
  }

  const { from, to } = currentMonthRange();

  const [transactions, expenseCategories, connections, restaurant, serviceDays] = await Promise.all([
    getFinancialTransactions(restaurantId),
    getExpenseCategories(restaurantId),
    getConnections(restaurantId),
    getRestaurant(restaurantId),
    getServiceDays(restaurantId, { from, to }),
  ]);

  return (
    <>
      <LiveKpiSync restaurantId={restaurantId} />
      <FinanceView
        transactions={transactions}
        expenseCategories={expenseCategories}
        connections={connections}
        serviceDays={serviceDays}
        breakEvenSettings={{
          fixedCosts: restaurant?.breakEvenFixedCosts ?? null,
          grossMarginPct: restaurant?.breakEvenGrossMarginPct ?? null,
          avgBasket: restaurant?.breakEvenAvgBasket ?? null,
        }}
      />
    </>
  );
}
