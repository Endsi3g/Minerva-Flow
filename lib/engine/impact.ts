import { getIncrementalRetentionRevenue, getVisitFrequencyImpact } from "@/lib/engine/retention";
import { getMenuMarginImpact } from "@/lib/menu-engineering";
import type { Customer, MenuItem } from "@/lib/types";

export type LtvImpact = {
  restaurantId: string;
  incrementalRevenue: number;
  marginGainPct: number;
  activeMarginPct: number;
  visitFrequency: ReturnType<typeof getVisitFrequencyImpact>;
};

/**
 * The "marge +4% / clients reviennent 2x plus souvent" targets, made
 * concrete: margin gained by acting on menu-engineering signals, visit
 * cadence for customers touched by the retention engine vs not, and
 * revenue directly attributable to a retention nudge. All three reuse
 * segmentation-based engine functions (no fixed before/after date, since a
 * restaurant that just turned retention on has no "before" period).
 */
export function computeLtvImpact(
  restaurantId: string,
  customers: Customer[],
  menuItems: MenuItem[],
  sends: { customerId: string; sentAt: string }[]
): LtvImpact {
  const margin = getMenuMarginImpact(menuItems);
  const visitFrequency = getVisitFrequencyImpact(customers, sends);
  const incrementalRevenue = getIncrementalRetentionRevenue(sends, customers, 14);

  return {
    restaurantId,
    incrementalRevenue,
    marginGainPct: margin.gainPct,
    activeMarginPct: margin.activeMarginPct,
    visitFrequency,
  };
}

export type LtvImpactRollup = {
  restaurantCount: number;
  totalIncrementalRevenue: number;
  avgMarginGainPct: number;
  avgActiveMarginPct: number;
  visitFrequency: {
    touchedPerMonth: number;
    untouchedPerMonth: number;
    multiplier: number;
    touchedCount: number;
    untouchedCount: number;
    hasEnoughSignal: boolean;
  };
  perRestaurant: LtvImpact[];
};

const MIN_TOUCHED_FOR_ROLLUP_SIGNAL = 5;

/**
 * Combines per-restaurant impacts for a franchise/multi-location rollup.
 * Revenue sums; margin averages plainly (each restaurant's menu is its own
 * comparable unit); visit frequency is a count-weighted average, not a
 * naive average of rates, so a 200-customer flagship doesn't get diluted
 * by a 10-customer new opening.
 */
export function aggregateLtvImpacts(impacts: LtvImpact[]): LtvImpactRollup {
  const restaurantCount = impacts.length;
  const totalIncrementalRevenue = Math.round(impacts.reduce((sum, i) => sum + i.incrementalRevenue, 0) * 100) / 100;
  const avgMarginGainPct =
    restaurantCount > 0 ? Math.round((impacts.reduce((sum, i) => sum + i.marginGainPct, 0) / restaurantCount) * 10) / 10 : 0;
  const avgActiveMarginPct =
    restaurantCount > 0
      ? Math.round((impacts.reduce((sum, i) => sum + i.activeMarginPct, 0) / restaurantCount) * 10) / 10
      : 0;

  const totalTouched = impacts.reduce((sum, i) => sum + i.visitFrequency.touchedCount, 0);
  const totalUntouched = impacts.reduce((sum, i) => sum + i.visitFrequency.untouchedCount, 0);
  const weightedTouchedPerMonth =
    totalTouched > 0
      ? impacts.reduce((sum, i) => sum + i.visitFrequency.touchedPerMonth * i.visitFrequency.touchedCount, 0) / totalTouched
      : 0;
  const weightedUntouchedPerMonth =
    totalUntouched > 0
      ? impacts.reduce((sum, i) => sum + i.visitFrequency.untouchedPerMonth * i.visitFrequency.untouchedCount, 0) /
        totalUntouched
      : 0;

  const hasEnoughSignal = totalTouched >= MIN_TOUCHED_FOR_ROLLUP_SIGNAL && totalUntouched > 0;

  return {
    restaurantCount,
    totalIncrementalRevenue,
    avgMarginGainPct,
    avgActiveMarginPct,
    visitFrequency: {
      touchedPerMonth: Math.round(weightedTouchedPerMonth * 100) / 100,
      untouchedPerMonth: Math.round(weightedUntouchedPerMonth * 100) / 100,
      multiplier:
        hasEnoughSignal && weightedUntouchedPerMonth > 0
          ? Math.round((weightedTouchedPerMonth / weightedUntouchedPerMonth) * 100) / 100
          : 0,
      touchedCount: totalTouched,
      untouchedCount: totalUntouched,
      hasEnoughSignal,
    },
    perRestaurant: impacts,
  };
}
