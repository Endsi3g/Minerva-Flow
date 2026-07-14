import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type WeeklyReportMetric = {
  label: string;
  value: number;
  unit: "currency" | "percent" | "count";
  wowDelta: number;
  reportSlug?: string;
};

export type WeeklyReportData = {
  weekStart: string;
  metrics: WeeklyReportMetric[];
};

type WeeklyReportRow = {
  id: string;
  restaurant_id: string;
  week_start: string;
  data: WeeklyReportData;
  created_at: string;
};

export async function getLatestWeeklyReport(restaurantId: string): Promise<WeeklyReportRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as WeeklyReportRow;
}

/** Every restaurant with at least one active member — server-only, for the cron fan-out. */
export async function getAllActiveRestaurantIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("status", "active");

  if (error || !data) return [];
  return Array.from(new Set(data.map((r) => r.restaurant_id as string)));
}

/** Active member user ids for a restaurant — server-only, for the cron fan-out. */
export async function getActiveMemberUserIds(restaurantId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurant_members")
    .select("user_id")
    .eq("restaurant_id", restaurantId)
    .eq("status", "active");

  if (error || !data) return [];
  return data.map((r) => r.user_id as string);
}

/**
 * Idempotent: returns the existing row if this restaurant/week was already
 * generated (unique(restaurant_id, week_start)), inserts otherwise.
 */
export async function saveWeeklyReport(
  restaurantId: string,
  weekStart: string,
  data: WeeklyReportData
): Promise<{ id: string; alreadyExisted: boolean } | null> {
  const admin = createAdminClient();

  const existing = await admin
    .from("weekly_reports")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (existing.data) return { id: existing.data.id as string, alreadyExisted: true };

  const { data: inserted, error } = await admin
    .from("weekly_reports")
    .insert({ restaurant_id: restaurantId, week_start: weekStart, data })
    .select("id")
    .single();

  if (error || !inserted) return null;
  return { id: inserted.id as string, alreadyExisted: false };
}
