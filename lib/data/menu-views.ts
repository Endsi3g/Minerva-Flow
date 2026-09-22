import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tracks daily menu visits to compute direct ordering conversion rates:
 * Conversion % = (Direct Orders / Menu Views) * 100
 *
 * Gracefully degrades if migration 0124 has not yet been applied in production.
 */
export async function recordMenuView(restaurantId: string): Promise<void> {
  if (!restaurantId) return;

  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    // Try reading today's record
    const { data: existing, error: selectError } = await admin
      .from("daily_menu_views")
      .select("id, views_count")
      .eq("restaurant_id", restaurantId)
      .eq("date", today)
      .maybeSingle();

    if (selectError) {
      // Table doesn't exist yet or PostgREST schema cache miss
      return;
    }

    if (existing) {
      await admin
        .from("daily_menu_views")
        .update({ views_count: (existing.views_count ?? 0) + 1 })
        .eq("id", existing.id);
    } else {
      await admin
        .from("daily_menu_views")
        .insert({
          restaurant_id: restaurantId,
          date: today,
          views_count: 1,
        });
    }
  } catch (err) {
    // Graceful degradation — menu views recording must never break menu rendering
  }
}

/**
 * Returns today's total menu views count for a restaurant.
 */
export async function getTodayMenuViews(restaurantId: string): Promise<number> {
  if (!restaurantId) return 0;

  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await admin
      .from("daily_menu_views")
      .select("views_count")
      .eq("restaurant_id", restaurantId)
      .eq("date", today)
      .maybeSingle();

    if (error || !data) {
      return 0;
    }

    return (data as { views_count: number }).views_count ?? 0;
  } catch {
    return 0;
  }
}
