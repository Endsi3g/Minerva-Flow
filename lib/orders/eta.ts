import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Same "busy" signal the public menu's delay banner uses (see
 * getMenuShareByToken) — manual toggle OR live en_preparation count over
 * the owner's threshold. Centralized here so order creation (which needs
 * it to bump the ETA) and the menu banner never disagree about whether
 * the restaurant is busy right now.
 */
export async function computeIsBusy(admin: SupabaseClient, restaurantId: string): Promise<boolean> {
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("busy_mode_manual, busy_threshold")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!restaurant) return false;
  const row = restaurant as { busy_mode_manual: boolean | null; busy_threshold: number | null };
  if (row.busy_mode_manual) return true;
  if (!row.busy_threshold) return false;

  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("status", "en_preparation");
  return (count ?? 0) >= row.busy_threshold;
}

/**
 * "Prêt dans X minutes" — the owner's default_prep_minutes, bumped 1.5x
 * (rounded to the nearest 5 minutes) when the restaurant is busy right
 * now. Returns null when the owner never set a default: the feature
 * stays opt-in, no order gets an estimate — and no auto-notify — until
 * they configure one on /etablissement.
 */
export function computeEstimatedReadyAt(
  defaultPrepMinutes: number | null,
  isBusy: boolean,
  now: Date = new Date()
): Date | null {
  if (!defaultPrepMinutes || defaultPrepMinutes <= 0) return null;
  const minutes = isBusy ? Math.round((defaultPrepMinutes * 1.5) / 5) * 5 : defaultPrepMinutes;
  return new Date(now.getTime() + minutes * 60_000);
}
