"use server";

import { getOrCreateDefaultMenuShare } from "@/lib/data/menu-shares";

export async function getOrCreateDefaultMenuShareTokenAction(restaurantId: string): Promise<string | null> {
  const share = await getOrCreateDefaultMenuShare(restaurantId);
  return share?.token ?? null;
}
