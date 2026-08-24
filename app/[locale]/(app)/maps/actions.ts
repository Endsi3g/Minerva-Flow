"use server";

import { getRevenueByRestaurant } from "@/lib/data/service-days";
import { geocodeRestaurantIfMissing } from "@/lib/data/restaurants";

export async function getRevenueByRestaurantAction(
  restaurantIds: string[]
): Promise<Record<string, { revenue: number; delta: number }>> {
  return getRevenueByRestaurant(restaurantIds);
}

export async function geocodeRestaurantIfMissingAction(restaurantId: string): Promise<{ lng: number; lat: number } | null> {
  if (!restaurantId) return null;
  return geocodeRestaurantIfMissing(restaurantId);
}
