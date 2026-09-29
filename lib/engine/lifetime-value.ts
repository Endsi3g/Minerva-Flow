import type { Customer, MenuItem } from "@/lib/types";

export type LifetimeValueComponents = {
  customerCount: number;
  revenueLtv: number;
  grossMarginPct: number | null;
  marginLtv: number | null;
  combinedLtv: number | null;
  missingCostItemCount: number;
  hasSalesWeights: boolean;
};

/**
 * Calculate the owner-selected LTV formula: average revenue LTV + estimated
 * margin LTV. Margin remains unknown when active menu costs or sales weights
 * are incomplete, instead of treating missing values as 0% food cost.
 */
export function computeLifetimeValueComponents(customers: Customer[], menuItems: MenuItem[]): LifetimeValueComponents {
  const purchasers = customers.filter((customer) => customer.totalSpent > 0);
  const revenueLtv = purchasers.length
    ? purchasers.reduce((sum, customer) => sum + customer.totalSpent, 0) / purchasers.length
    : 0;
  const activeItems = menuItems.filter((item) => item.active && !item.isDraft && item.price > 0);
  const missingCostItemCount = activeItems.filter((item) => item.foodCost <= 0).length;
  const totalUnits = activeItems.reduce((sum, item) => sum + Math.max(0, item.unitsSold), 0);
  const hasSalesWeights = totalUnits > 0;
  const marginIsCalculable = activeItems.length > 0 && missingCostItemCount === 0 && hasSalesWeights;
  const grossMarginPct = marginIsCalculable
    ? activeItems.reduce(
        (sum, item) => sum + Math.max(0, item.unitsSold) * Math.max(0, Math.min(1, (item.price - item.foodCost) / item.price)),
        0,
      ) / totalUnits
    : null;
  const marginLtv = grossMarginPct === null ? null : revenueLtv * grossMarginPct;

  return {
    customerCount: purchasers.length,
    revenueLtv,
    grossMarginPct,
    marginLtv,
    combinedLtv: marginLtv === null ? null : revenueLtv + marginLtv,
    missingCostItemCount,
    hasSalesWeights,
  };
}
