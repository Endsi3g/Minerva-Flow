import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { hasGoogleScope } from "@/lib/data/google-connections";
import { formatDateFull } from "@/lib/utils";
import { after } from "next/server";
import type { Anomaly, RushLevel, ServiceDay, ServiceSource } from "@/lib/types";

/**
 * Background Calendar sync, scheduled via next/server's after() so it keeps
 * running past the response (a bare fire-and-forget promise can get killed
 * mid-flight once the serverless function returns) — never allowed to fail
 * the caller's write. Only runs when the restaurant has granted the
 * calendar scope.
 */
function syncCalendarInBackground(restaurantId: string, serviceDay: ServiceDay) {
  after(async () => {
    try {
      const enabled = await hasGoogleScope(restaurantId, "calendar");
      if (!enabled) return;
      const { syncServiceDayEvent } = await import("@/lib/google/calendar");
      await syncServiceDayEvent(restaurantId, serviceDay);
    } catch (err) {
      console.error("Calendar sync failed:", err);
    }
  });
}

type ServiceDayRow = {
  id: string;
  restaurant_id: string;
  date: string;
  revenue: number;
  expenses: number | null;
  reservation_count: number | null;
  main_source: string;
  rush_level: RushLevel;
  events: string[] | null;
  notes: string | null;
  promo_active: boolean | null;
  menu_change: boolean | null;
  reviewed: boolean | null;
  created_by: string | null;
  created_at: string;
};

function anomalyFromRushLevel(level: RushLevel): Anomaly {
  if (level === "rush" || level === "debordement") return "rush";
  if (level === "calme") return "creux";
  return null;
}

function mapServiceDay(row: ServiceDayRow, authorName: string): ServiceDay {
  return {
    id: row.id,
    date: row.date,
    restaurantId: row.restaurant_id,
    revenue: row.revenue,
    mainSource: row.main_source as ServiceSource,
    events: row.events ?? [],
    notes: row.notes ?? "",
    anomaly: anomalyFromRushLevel(row.rush_level),
    author: authorName,
    expenses: row.expenses ?? undefined,
    reservationCount: row.reservation_count ?? undefined,
    rushLevel: row.rush_level,
    promoActive: row.promo_active ?? undefined,
    menuChange: row.menu_change ?? undefined,
    reviewed: row.reviewed ?? undefined,
    createdBy: row.created_by,
  };
}

/**
 * Looks up display names for a set of auth.users ids via `profiles`.
 * There's no FK from service_days.created_by straight to `profiles` (both
 * reference auth.users independently), so PostgREST can't embed the join —
 * fetch and merge instead.
 */
async function namesByUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: (string | null)[]
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase.from("profiles").select("id, full_name").in("id", uniqueIds);
  for (const p of (data as { id: string; full_name: string | null }[]) ?? []) {
    map.set(p.id, p.full_name ?? "—");
  }
  return map;
}

/** First/last ISO date of the calendar month containing `date`. */
function monthRange(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    from: new Date(year, month, 1).toISOString().slice(0, 10),
    to: new Date(year, month + 1, 0).toISOString().slice(0, 10),
  };
}

/**
 * Current-month revenue per restaurant (with % delta vs the previous
 * month), summed straight from `service_days` — used by the establishments
 * map to annotate markers with real figures instead of placeholder data.
 */
export async function getRevenueByRestaurant(
  restaurantIds: string[]
): Promise<Record<string, { revenue: number; delta: number }>> {
  const result: Record<string, { revenue: number; delta: number }> = {};
  if (restaurantIds.length === 0) return result;

  const now = new Date();
  const current = monthRange(now);
  const previous = monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const supabase = await createClient();
  const { data } = await supabase
    .from("service_days")
    .select("restaurant_id, date, revenue")
    .in("restaurant_id", restaurantIds)
    .gte("date", previous.from)
    .lte("date", current.to);

  const rows = (data as { restaurant_id: string; date: string; revenue: number }[]) ?? [];
  const currentByRestaurant = new Map<string, number>();
  const previousByRestaurant = new Map<string, number>();

  for (const row of rows) {
    const bucket = row.date >= current.from ? currentByRestaurant : previousByRestaurant;
    bucket.set(row.restaurant_id, (bucket.get(row.restaurant_id) ?? 0) + row.revenue);
  }

  for (const id of restaurantIds) {
    const revenue = currentByRestaurant.get(id) ?? 0;
    const previousRevenue = previousByRestaurant.get(id) ?? 0;
    const delta = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;
    result[id] = { revenue, delta };
  }

  return result;
}

export async function getServiceDays(
  restaurantId: string,
  range?: { from?: string; to?: string }
): Promise<ServiceDay[]> {
  const supabase = await createClient();
  let query = supabase
    .from("service_days")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: false });

  if (range?.from) query = query.gte("date", range.from);
  if (range?.to) query = query.lte("date", range.to);

  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data as ServiceDayRow[];
  const names = await namesByUserId(supabase, rows.map((r) => r.created_by));
  return rows.map((row) => mapServiceDay(row, names.get(row.created_by ?? "") ?? "—"));
}

export async function getServiceDay(
  restaurantId: string,
  id: string
): Promise<ServiceDay | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_days")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ServiceDayRow;
  const names = await namesByUserId(supabase, [row.created_by]);
  return mapServiceDay(row, names.get(row.created_by ?? "") ?? "—");
}

export type ServiceDayInput = {
  date: string;
  revenue: number;
  expenses?: number;
  reservationCount?: number;
  mainSource: ServiceSource;
  rushLevel?: RushLevel;
  events?: string[];
  notes?: string;
  promoActive?: boolean;
  menuChange?: boolean;
  reviewed?: boolean;
};

export async function createServiceDay(
  restaurantId: string,
  input: ServiceDayInput
): Promise<ServiceDay | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("service_days")
    .upsert(
      {
        restaurant_id: restaurantId,
        date: input.date,
        revenue: input.revenue,
        expenses: input.expenses ?? 0,
        reservation_count: input.reservationCount ?? 0,
        main_source: input.mainSource,
        rush_level: input.rushLevel ?? "normal",
        events: input.events ?? [],
        notes: input.notes ?? "",
        promo_active: input.promoActive ?? false,
        menu_change: input.menuChange ?? false,
        reviewed: input.reviewed ?? false,
        created_by: user?.id,
      },
      { onConflict: "restaurant_id,date" }
    )
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "service_day.create",
    entityType: "service_day",
    entityId: data.id,
    description: `A ajouté la journée du ${formatDateFull(input.date)}`,
  });

  const row = data as ServiceDayRow;
  const names = await namesByUserId(supabase, [row.created_by]);
  const serviceDay = mapServiceDay(row, names.get(row.created_by ?? "") ?? "—");
  syncCalendarInBackground(restaurantId, serviceDay);
  return serviceDay;
}

export async function updateServiceDay(
  restaurantId: string,
  id: string,
  patch: Partial<ServiceDayInput>
): Promise<ServiceDay | null> {
  const supabase = await createClient();

  const dbPatch: Record<string, unknown> = {};
  if (patch.date !== undefined) dbPatch.date = patch.date;
  if (patch.revenue !== undefined) dbPatch.revenue = patch.revenue;
  if (patch.expenses !== undefined) dbPatch.expenses = patch.expenses;
  if (patch.reservationCount !== undefined) dbPatch.reservation_count = patch.reservationCount;
  if (patch.mainSource !== undefined) dbPatch.main_source = patch.mainSource;
  if (patch.rushLevel !== undefined) dbPatch.rush_level = patch.rushLevel;
  if (patch.events !== undefined) dbPatch.events = patch.events;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;
  if (patch.promoActive !== undefined) dbPatch.promo_active = patch.promoActive;
  if (patch.menuChange !== undefined) dbPatch.menu_change = patch.menuChange;
  if (patch.reviewed !== undefined) dbPatch.reviewed = patch.reviewed;

  const { data, error } = await supabase
    .from("service_days")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "service_day.update",
    entityType: "service_day",
    entityId: id,
    description: `A modifié la journée du ${formatDateFull(data.date)}`,
  });

  const row = data as ServiceDayRow;
  const names = await namesByUserId(supabase, [row.created_by]);
  const serviceDay = mapServiceDay(row, names.get(row.created_by ?? "") ?? "—");
  syncCalendarInBackground(restaurantId, serviceDay);
  return serviceDay;
}

export async function deleteServiceDay(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_days")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);

  if (error) return false;

  await logActivity({
    restaurantId,
    actionType: "service_day.delete",
    entityType: "service_day",
    entityId: id,
    description: "A supprimé une journée de service",
  });

  return true;
}
