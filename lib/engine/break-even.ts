// Single source of truth for the "seuil de rentabilité" math shared by the
// Finance simulator (components/finance/BreakEvenSimulator.tsx) and the
// Overview "Objectif du jour" stat — both need to agree on how many clients
// per day a restaurant needs to break even, from the same three
// assumptions. Defaults mirror what the simulator always showed before
// these were persisted per restaurant.
export const BREAK_EVEN_DEFAULTS = {
  fixedCosts: 18500,
  grossMarginPct: 68,
  avgBasket: 38.5,
};

// A café's average ticket and cost structure are structurally different
// from a full-service restaurant's — used both server-side (restaurant
// creation, lib/data/restaurants.ts) and client-side (onboarding wizard's
// live prefill when "Café" is selected), hence living here rather than in
// a server-only data module.
export const CAFE_BREAK_EVEN_DEFAULTS = {
  fixedCosts: 9500,
  grossMarginPct: 74,
  avgBasket: 8.5,
};

export type BreakEvenAssumptions = {
  fixedCosts: number;
  grossMarginPct: number;
  avgBasket: number;
};

export type BreakEvenResult = {
  breakEvenMonthly: number;
  breakEvenDaily: number;
  dailyCoversNeeded: number;
};

export function computeBreakEven({ fixedCosts, grossMarginPct, avgBasket }: BreakEvenAssumptions): BreakEvenResult {
  const grossMarginRatio = grossMarginPct / 100;
  const breakEvenMonthly = grossMarginRatio > 0 ? fixedCosts / grossMarginRatio : 0;
  const breakEvenDaily = breakEvenMonthly / 30;
  const dailyCoversNeeded = avgBasket > 0 ? Math.ceil(breakEvenDaily / avgBasket) : 0;
  return { breakEvenMonthly, breakEvenDaily, dailyCoversNeeded };
}
