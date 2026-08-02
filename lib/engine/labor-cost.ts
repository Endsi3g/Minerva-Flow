import type { FinancialTransaction } from "@/lib/types";

export const LABOR_COST_TARGET_PCT = 30;

/**
 * The only reliable signal for "this transaction is labor cost" — category is
 * free-text and user-renamable (lib/data/finance.ts createExpenseCategory),
 * but bookLaborExpense (lib/data/employees.ts) always tags auto-booked shift
 * expenses with this sourceAccount.
 */
export const LABOR_COST_SOURCE_ACCOUNT = "Paie";

export function sumLaborCost(transactions: FinancialTransaction[]): number {
  return transactions
    .filter((t) => t.direction === "out" && t.sourceAccount === LABOR_COST_SOURCE_ACCOUNT)
    .reduce((sum, t) => sum + t.amount, 0);
}

export type LaborCostResult = {
  pct: number | null;
  amount: number;
  revenue: number;
  withinTarget: boolean | null;
};

export function computeLaborCostPct({ amount, revenue }: { amount: number; revenue: number }): LaborCostResult {
  const pct = revenue > 0 ? Math.round((amount / revenue) * 1000) / 10 : null;
  return { pct, amount, revenue, withinTarget: pct === null ? null : pct <= LABOR_COST_TARGET_PCT };
}
