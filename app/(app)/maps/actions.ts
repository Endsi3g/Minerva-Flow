"use server";

import { getAdConversions } from "@/lib/data/ad-platforms";
import type { AdChannel, AdConversion } from "@/lib/types";

export async function getAdConversionsAction(
  restaurantId: string,
  channel?: AdChannel
): Promise<AdConversion[]> {
  if (!restaurantId) return [];
  return getAdConversions(restaurantId, channel ? { channel } : undefined);
}
