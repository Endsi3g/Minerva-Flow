import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MinervaResultsInput, RestaurantResultsInput } from "@/lib/share/results";

export const SHARE_PERIODS = [7, 30, 90] as const;
export type SharePeriod = (typeof SHARE_PERIODS)[number];

export function parseSharePeriod(value: string | string[] | undefined): SharePeriod {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (SHARE_PERIODS as readonly number[]).includes(n) ? (n as SharePeriod) : 30;
}

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
}

/**
 * Aggregates only: counts and an average, never a customer's name or contact.
 * Callers must already have verified the caller is an owner/manager of
 * `restaurantId` (see the page); this uses the service client.
 */
export async function getRestaurantShareResults(restaurantId: string, days: SharePeriod): Promise<RestaurantResultsInput> {
  const admin = createAdminClient();
  const since = sinceIso(days);

  const [total, recent, returning, served, reviews] = await Promise.all([
    admin.from("customers").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
    admin.from("customers").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gte("created_at", since),
    admin.from("customers").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gte("visit_count", 2),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).eq("status", "servie").gte("created_at", since),
    admin.from("restaurant_reviews").select("rating").eq("restaurant_id", restaurantId).eq("visibility", "public"),
  ]);

  const ratings = ((reviews.data ?? []) as { rating: number }[]).map((row) => row.rating).filter((r) => Number.isFinite(r));
  return {
    newMembers: recent.count ?? 0,
    returningMembers: returning.count ?? 0,
    totalMembers: total.count ?? 0,
    ordersServed: served.count ?? 0,
    reviewAverage: ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null,
    reviewCount: ratings.length,
    periodDays: days,
  };
}

/**
 * Minerva-wide product-usage figures for team-made social posts. Callers must
 * already have verified is_team_member. Restaurants flagged is_demo are
 * excluded everywhere, so test and internal accounts never inflate a number.
 */
export async function getMinervaShareResults(): Promise<MinervaResultsInput> {
  const admin = createAdminClient();

  const { data: restaurants } = await admin.from("restaurants").select("id").eq("is_demo", false);
  const ids = ((restaurants ?? []) as { id: string }[]).map((row) => row.id);
  if (ids.length === 0) return { restaurantsWithMenu: 0, restaurantsActivated: 0, customersEnrolled: 0, ordersServed: 0 };

  const [menuRows, customers, orders, funnel] = await Promise.all([
    admin.from("menu_items").select("restaurant_id").in("restaurant_id", ids).eq("is_draft", false).limit(20000),
    admin.from("customers").select("id", { count: "exact", head: true }).in("restaurant_id", ids),
    admin.from("orders").select("id", { count: "exact", head: true }).in("restaurant_id", ids).eq("status", "servie"),
    admin.rpc("team_funnel_counts"),
  ]);

  const withMenu = new Set(((menuRows.data ?? []) as { restaurant_id: string }[]).map((row) => row.restaurant_id));
  const counts = (funnel.data as { activated: number | string }[] | null)?.[0];

  return {
    restaurantsWithMenu: withMenu.size,
    restaurantsActivated: Number(counts?.activated ?? 0),
    customersEnrolled: customers.count ?? 0,
    ordersServed: orders.count ?? 0,
  };
}
