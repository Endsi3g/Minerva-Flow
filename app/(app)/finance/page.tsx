import { LiveKpiSync } from "@/components/realtime/LiveKpiSync";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransactions, getExpenseCategories, getConnections } from "@/lib/data/finance";
import { FinanceView } from "./FinanceView";

export default async function FinancePage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return <FinanceView transactions={[]} expenseCategories={[]} connections={[]} />;
  }

  const [transactions, expenseCategories, connections] = await Promise.all([
    getFinancialTransactions(restaurantId),
    getExpenseCategories(restaurantId),
    getConnections(restaurantId),
  ]);

  return (
    <>
      <LiveKpiSync restaurantId={restaurantId} />
      <FinanceView
        transactions={transactions}
        expenseCategories={expenseCategories}
        connections={connections}
      />
    </>
  );
}
