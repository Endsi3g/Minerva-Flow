import "server-only";
import { getCustomers } from "@/lib/data/customers";
import { getMenuItems } from "@/lib/data/menu";
import { getRestaurant } from "@/lib/data/restaurants";
import { getRetentionSends } from "@/lib/data/retention-sends";
import { getInactiveCustomers, getDriftingHighValueCustomers } from "@/lib/engine/retention";
import { computeLtvImpact, type LtvImpact } from "@/lib/engine/impact";
import type { Customer } from "@/lib/types";
import type { RetentionTrigger } from "@/lib/retention/send";

/** Fetches everything computeLtvImpact needs for one restaurant and runs it. */
export async function getLtvImpact(restaurantId: string): Promise<LtvImpact> {
  const [customers, menuItems, sends] = await Promise.all([
    getCustomers(restaurantId),
    getMenuItems(restaurantId),
    getRetentionSends(restaurantId),
  ]);

  return computeLtvImpact(restaurantId, customers, menuItems, sends);
}

/** Same, across every restaurant in a list — for the franchise rollup view. */
export async function getLtvImpactForRestaurants(restaurantIds: string[]): Promise<LtvImpact[]> {
  return Promise.all(restaurantIds.map(getLtvImpact));
}

export type AtRiskCustomer = { customer: Customer; trigger: RetentionTrigger };

/**
 * The action behind "Ventes grâce à la fidélisation" on /impact: customers
 * who'd be reached by tomorrow's retention cron, but who could be reached
 * right now instead. Same eligibility rules as the cron (consented,
 * inactive/drifting, not already contacted within the frequency cap) —
 * this is the manual, right-now version of the same targeting, not a
 * separate rule set. Capped to the top spenders so the list stays a
 * short, actionable checklist rather than a second customer table.
 */
export async function getActionableAtRiskCustomers(restaurantId: string, limit = 5): Promise<AtRiskCustomer[]> {
  const restaurant = await getRestaurant(restaurantId);
  if (!restaurant?.retentionEngineEnabled) return [];

  const [customers, sends] = await Promise.all([getCustomers(restaurantId), getRetentionSends(restaurantId)]);
  const consented = customers.filter((c) => c.marketingConsent);
  if (consented.length === 0) return [];

  const capCutoff = Date.now() - restaurant.retentionFrequencyCapDays * 86_400_000;
  const recentlyContacted = new Set(
    sends.filter((s) => new Date(s.sentAt).getTime() >= capCutoff).map((s) => s.customerId)
  );
  const eligible = (list: Customer[]) => list.filter((c) => !recentlyContacted.has(c.id));

  const targets = new Map<string, AtRiskCustomer>();
  for (const c of eligible(getInactiveCustomers(consented, restaurant.retentionInactivityDays))) {
    targets.set(c.id, { customer: c, trigger: "inactivity" });
  }
  for (const c of eligible(getDriftingHighValueCustomers(consented))) {
    targets.set(c.id, { customer: c, trigger: "value_drift" });
  }

  return Array.from(targets.values())
    .sort((a, b) => b.customer.totalSpent - a.customer.totalSpent)
    .slice(0, limit);
}
