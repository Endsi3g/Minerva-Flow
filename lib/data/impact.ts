import "server-only";
import { getCustomers } from "@/lib/data/customers";
import { getMenuItems } from "@/lib/data/menu";
import { getRetentionSends } from "@/lib/data/retention-sends";
import { computeLtvImpact, type LtvImpact } from "@/lib/engine/impact";

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
