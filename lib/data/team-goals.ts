import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamMetricsSnapshot } from "@/lib/data/team-metrics";

export const GOAL_METRICS = [
  { key: "restaurants_new", label: "Nouveaux restaurants ce mois", unit: "count" },
  { key: "activated_restaurants", label: "Restaurants activés", unit: "count" },
  { key: "active_subscriptions", label: "Abonnements actifs", unit: "count" },
  { key: "mrr", label: "MRR", unit: "money" },
  { key: "visitors", label: "Visiteurs uniques (30 jours)", unit: "count" },
] as const;

export type GoalMetric = (typeof GOAL_METRICS)[number]["key"];

export type GoalRow = {
  metric: GoalMetric;
  label: string;
  unit: "count" | "money";
  actual: number | null;
  target: number | null;
};

export type GoalsSnapshot = {
  month: string; // YYYY-MM-01, restaurant-local (Montréal)
  elapsedPct: number; // share of the month already gone, to read progress against pace
  rows: GoalRow[];
};

const GOAL_KEYS = new Set<string>(GOAL_METRICS.map((m) => m.key));

export function isGoalMetric(value: string): value is GoalMetric {
  return GOAL_KEYS.has(value);
}

/** First day of the current month in Montréal time, not server (UTC) time. */
export function currentMonthStart(now = new Date()): string {
  return `${now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" }).slice(0, 7)}-01`;
}

function elapsedShareOfMonth(now = new Date()): number {
  const [year, month, day] = now
    .toLocaleDateString("en-CA", { timeZone: "America/Toronto" })
    .split("-")
    .map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return Math.min(100, Math.max(0, (day / daysInMonth) * 100));
}

function actualFor(metric: GoalMetric, snapshot: TeamMetricsSnapshot): number | null {
  switch (metric) {
    case "restaurants_new":
      return snapshot.newRestaurantsThisMonth;
    case "activated_restaurants":
      return snapshot.funnel.stages.find((stage) => stage.key === "activated")?.count ?? 0;
    case "active_subscriptions":
      return snapshot.activeSubscriptions;
    case "mrr":
      return snapshot.mrr;
    case "visitors":
      return snapshot.visitors ? snapshot.visitors.total : null;
  }
}

export async function readGoalsSnapshot(client: SupabaseClient, snapshot: TeamMetricsSnapshot): Promise<GoalsSnapshot> {
  const month = currentMonthStart();
  const { data } = await client.from("team_monthly_goals").select("metric, target").eq("month", month);
  const targets = new Map<string, number>(
    ((data ?? []) as { metric: string; target: number | string }[]).map((row) => [row.metric, Number(row.target)])
  );

  return {
    month,
    elapsedPct: elapsedShareOfMonth(),
    rows: GOAL_METRICS.map((m) => ({
      metric: m.key,
      label: m.label,
      unit: m.unit,
      actual: actualFor(m.key, snapshot),
      target: targets.get(m.key) ?? null,
    })),
  };
}

/**
 * Callers must already have verified is_team_member. The RLS policy on
 * team_monthly_goals enforces it again when `client` is a user session.
 */
export async function writeGoal(client: SupabaseClient, userId: string, metric: string, target: number): Promise<boolean> {
  if (!isGoalMetric(metric) || !Number.isFinite(target) || target < 0 || target > 1_000_000_000) return false;
  const { error } = await client.from("team_monthly_goals").upsert(
    { month: currentMonthStart(), metric, target, updated_by: userId, updated_at: new Date().toISOString() },
    { onConflict: "month,metric" }
  );
  return !error;
}
