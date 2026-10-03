import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import { PLANS } from "@/lib/billing/plans";
import type { PlanTier } from "@/lib/ai/quotas";
import { getTrafficOverview, isPostHogQueryConfigured } from "@/lib/data/posthog-insights";
import { currentMonthStart, GOAL_METRICS } from "@/lib/data/team-goals";
import { buildFunnel, deriveGtmFocus, type FunnelStage, type GtmFocus } from "@/lib/team/gtm-focus";
import { toMontrealDate } from "@/lib/team/contributions";

export type TeamMetricsSnapshot = {
  /** Real restaurants only: rows flagged is_demo (seed/test/demo accounts) are excluded everywhere. */
  totalRestaurants: number;
  newRestaurantsThisMonth: number;
  newRestaurantsDeltaPct: number | null;
  activeSubscriptions: number;
  mrr: number;
  mrrDeltaPct: number | null;
  churnedThisMonth: number;
  churnRatePct: number | null;
  restaurantsJoinedSeries: { date: string; count: number }[];
  mrrSeries: { date: string; revenue: number }[];
  /** Null until POSTHOG_PERSONAL_API_KEY is set (PostHog collects without it, but can't be queried). */
  visitors: { total: number; deltaPct: number | null } | null;
  funnel: { stages: FunnelStage[]; demosExcluded: number };
  focus: GtmFocus;
};

const MONTHS_OF_HISTORY = 12;
const PAGE_SIZE = 1000; // PostgREST's default max rows per request

function monthlyValue(planTier: string | null, billingInterval: string | null): number {
  const plan = PLANS[planTier as PlanTier];
  if (!plan) return 0;
  if (billingInterval === "yearly") return (plan.yearlyPriceCad ?? 0) / 12;
  return plan.monthlyPriceCad ?? 0;
}

/** "YYYY-MM" in Montréal time: a signup at 9 pm on the 30th belongs to that month, not the next (UTC). */
function monthBucket(iso: string): string {
  return toMontrealDate(iso).slice(0, 7);
}

function lastNMonthBuckets(n: number): string[] {
  const [year, month] = toMontrealDate(new Date()).split("-").map(Number);
  const buckets: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    buckets.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return buckets;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * A plain .select() silently stops at 1 000 rows; a dashboard that quietly
 * undercounts is worse than one that errors, so page until exhausted.
 */
async function selectAll<T>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  match: Record<string, string | boolean> = {}
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    // Filters first, then ordering/paging (transform builders have no .match()).
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .match(match)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

/**
 * Platform-wide (cross-tenant) by design — the admin client is required
 * since RLS scopes every restaurant/subscriptions read to one tenant.
 * Gated here too (not just at the page), mirroring isPlatformAdmin's own
 * defense-in-depth pattern in lib/data/admin.ts — ambassadors must never
 * reach this, even if a future caller forgets the page-level check.
 */
export async function getTeamMetricsSnapshot(): Promise<TeamMetricsSnapshot | null> {
  const access = await getTeamPortalAccess();
  if (!access?.isTeamMember) return null;
  return computeTeamMetrics();
}

/**
 * No auth inside — callers must have already verified is_team_member
 * (cookie session via getTeamMetricsSnapshot, or Bearer token in
 * app/api/team/metrics/route.ts for the native app).
 */
export async function computeTeamMetrics(): Promise<TeamMetricsSnapshot> {
  const admin = createAdminClient();
  const buckets = lastNMonthBuckets(MONTHS_OF_HISTORY);

  const [restaurantRows, subscriptionRows, funnelRpc, goalRows, traffic] = await Promise.all([
    selectAll<{ created_at: string }>(admin, "restaurants", "created_at", { is_demo: false }),
    selectAll<{
      status: string;
      plan_tier: string | null;
      billing_interval: string | null;
      created_at: string;
      canceled_at: string | null;
    }>(admin, "subscriptions", "status, plan_tier, billing_interval, created_at, canceled_at"),
    admin.rpc("team_funnel_counts"),
    admin.from("team_monthly_goals").select("metric, target").eq("month", currentMonthStart()),
    isPostHogQueryConfigured() ? getTrafficOverview(30) : Promise.resolve(null),
  ]);

  const counts = (funnelRpc.data as { restaurants: number | string; activated: number | string; demos_excluded: number | string }[] | null)?.[0];
  const registered = Number(counts?.restaurants ?? restaurantRows.length);
  const activated = Number(counts?.activated ?? 0);
  const demosExcluded = Number(counts?.demos_excluded ?? 0);

  const activeStatuses = new Set(["active", "trialing"]);
  const activeSubs = subscriptionRows.filter((s) => activeStatuses.has(s.status));
  const mrr = activeSubs.reduce((sum, s) => sum + monthlyValue(s.plan_tier, s.billing_interval), 0);

  const thisMonth = buckets[buckets.length - 1];
  const lastMonth = buckets[buckets.length - 2] ?? thisMonth;

  const newRestaurantsThisMonth = restaurantRows.filter((r) => monthBucket(r.created_at) === thisMonth).length;
  const newRestaurantsLastMonth = restaurantRows.filter((r) => monthBucket(r.created_at) === lastMonth).length;

  const churnedThisMonth = subscriptionRows.filter((s) => s.canceled_at && monthBucket(s.canceled_at) === thisMonth).length;
  const activeAtStartOfMonth = subscriptionRows.filter((s) => {
    const createdBucket = monthBucket(s.created_at);
    const canceledBucket = s.canceled_at ? monthBucket(s.canceled_at) : null;
    return createdBucket < thisMonth && (canceledBucket === null || canceledBucket >= thisMonth);
  }).length;
  const churnRatePct = activeAtStartOfMonth > 0 ? (churnedThisMonth / activeAtStartOfMonth) * 100 : null;

  const restaurantsJoinedSeries = buckets.map((bucket) => ({
    date: `${bucket}-01`,
    count: restaurantRows.filter((r) => monthBucket(r.created_at) === bucket).length,
  }));

  const mrrSeries = buckets.map((bucket) => {
    // MRR "as of" the end of that bucket month: created on/before, not yet
    // canceled by then (or canceled after) — a simple point-in-time
    // reconstruction from the two timestamps we actually have, not a
    // stored historical snapshot.
    const revenue = subscriptionRows
      .filter((s) => monthBucket(s.created_at) <= bucket && (!s.canceled_at || monthBucket(s.canceled_at) > bucket))
      .reduce((sum, s) => sum + monthlyValue(s.plan_tier, s.billing_interval), 0);
    return { date: `${bucket}-01`, revenue };
  });

  const mrrLastMonth = mrrSeries[mrrSeries.length - 2]?.revenue ?? 0;

  const targets = new Map(((goalRows.data ?? []) as { metric: string; target: number | string }[]).map((g) => [g.metric, Number(g.target)]));

  return {
    totalRestaurants: registered,
    newRestaurantsThisMonth,
    newRestaurantsDeltaPct: pctChange(newRestaurantsThisMonth, newRestaurantsLastMonth),
    activeSubscriptions: activeSubs.length,
    mrr,
    mrrDeltaPct: pctChange(mrr, mrrLastMonth),
    churnedThisMonth,
    churnRatePct,
    restaurantsJoinedSeries,
    mrrSeries,
    visitors: traffic ? { total: traffic.uniqueVisitors, deltaPct: traffic.uniqueVisitorsDelta } : null,
    funnel: { stages: buildFunnel({ registered, activated, paying: activeSubs.length }), demosExcluded },
    focus: deriveGtmFocus({
      registered,
      activated,
      paying: activeSubs.length,
      mrr,
      visitorsConnected: traffic !== null,
      goalsSet: GOAL_METRICS.filter((m) => targets.has(m.key)).length,
      activatedTarget: targets.get("activated_restaurants") ?? null,
      mrrTarget: targets.get("mrr") ?? null,
    }),
  };
}
