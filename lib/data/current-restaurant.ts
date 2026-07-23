import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getUserRestaurants } from "@/lib/data/restaurants";
import type { Role } from "@/lib/types";

const COOKIE_NAME = "mv_restaurant_id";

/**
 * Resolves which restaurant is "current" for this request: the
 * mv_restaurant_id cookie if it's set and the user is actually an active
 * member of that restaurant, otherwise the user's first restaurant.
 * Returns null if the user has no restaurants at all.
 */
export async function getCurrentRestaurantId(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;

  const restaurants = await getUserRestaurants();
  if (restaurants.length === 0) return null;

  if (cookieValue && restaurants.some((r) => r.id === cookieValue)) {
    return cookieValue;
  }

  return restaurants[0].id;
}

export async function getCurrentRestaurant() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return null;
  const restaurants = await getUserRestaurants();
  return restaurants.find((r) => r.id === restaurantId) || null;
}

export type CurrentMembership = {
  restaurantId: string;
  role: Role;
  sidebarPermissions: string[] | null;
};

/**
 * The current user's membership (restaurantId + role + sidebar permission
 * overlay) for the current restaurant, resolved via getCurrentRestaurantId().
 * Returns null if the user isn't signed in or has no active restaurant
 * membership.
 */
export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return null;

  const { data, error } = await supabase
    .from("restaurant_members")
    .select("role, sidebar_permissions")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  return {
    restaurantId,
    role: data.role as Role,
    sidebarPermissions: (data.sidebar_permissions as string[] | null) ?? null,
  };
}
