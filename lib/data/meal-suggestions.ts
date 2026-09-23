import { createClient } from "@/lib/supabase/server";

export type MealSuggestion = {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  status: "open" | "under_review" | "draft_added";
  menu_item_id: string | null;
  created_at: string;
  vote_count: number;
  has_voted: boolean;
};

export type MealSuggestionsLoadResult =
  | { ok: true; suggestions: MealSuggestion[] }
  | { ok: false; reason: "unavailable" };

/** RLS inside get_meal_suggestions ensures the signed-in user belongs to this restaurant. */
export async function getMealSuggestionsForRestaurant(restaurantId: string): Promise<MealSuggestionsLoadResult> {
  if (!restaurantId) return { ok: true, suggestions: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_meal_suggestions", { p_restaurant_id: restaurantId });
  if (error || !data) {
    console.error("getMealSuggestionsForRestaurant: suggestions unavailable", error?.code ?? "unknown");
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true, suggestions: data as MealSuggestion[] };
}
