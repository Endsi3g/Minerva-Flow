"use server";

import { getAdConversions } from "@/lib/data/ad-platforms";
import { getRevenueByRestaurant } from "@/lib/data/service-days";
import type { AdChannel, AdConversion } from "@/lib/types";

export async function getAdConversionsAction(
  restaurantId: string,
  channel?: AdChannel
): Promise<AdConversion[]> {
  if (!restaurantId) return [];
  return getAdConversions(restaurantId, channel ? { channel } : undefined);
}

export async function getRevenueByRestaurantAction(
  restaurantIds: string[]
): Promise<Record<string, { revenue: number; delta: number }>> {
  return getRevenueByRestaurant(restaurantIds);
}
