import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LiveKpiSync } from "@/components/realtime/LiveKpiSync";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getFinancialTransactions, getExpenseCategories, getConnections } from "@/lib/data/finance";
import { getServiceDays } from "@/lib/data/service-days";
import { getRestaurant } from "@/lib/data/restaurants";
import { BREAK_EVEN_DEFAULTS } from "@/lib/engine/break-even";
import { FinanceView } from "./FinanceView";

function currentMonthRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(year, month, 1).toISOString().slice(0, 10);
  const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("finance") };
}

export default async function FinancePage() {
  const restaurantId = await getCurrentRestaurantId();

  if (!restaurantId) {
    return (
      <FinanceView
        transactions={[]}
        expenseCategories={[]}
        connections={[]}
        serviceDays={[]}
        breakEven={BREAK_EVEN_DEFAULTS}
      />
    );
  }

  const { from, to } = currentMonthRange();

  const [transactions, expenseCategories, connections, serviceDays, restaurant] = await Promise.all([
    getFinancialTransactions(restaurantId),
    getExpenseCategories(restaurantId),
    getConnections(restaurantId),
    getServiceDays(restaurantId, { from, to }),
    getRestaurant(restaurantId),
  ]);

  const breakEven = {
    fixedCosts: restaurant?.breakEvenFixedCosts ?? BREAK_EVEN_DEFAULTS.fixedCosts,
    grossMarginPct: restaurant?.breakEvenGrossMarginPct ?? BREAK_EVEN_DEFAULTS.grossMarginPct,
    avgBasket: restaurant?.breakEvenAvgBasket ?? BREAK_EVEN_DEFAULTS.avgBasket,
  };

  return (
    <>
      <LiveKpiSync restaurantId={restaurantId} />
      <FinanceView
        transactions={transactions}
        expenseCategories={expenseCategories}
        connections={connections}
        serviceDays={serviceDays}
        breakEven={breakEven}
      />
    </>
  );
}
