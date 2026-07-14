"use server";

import { isMetaAdsConfigured, isGoogleAdsConfigured } from "@/lib/ad-platforms/config";
import { getAdPlatformConnections } from "@/lib/data/ad-platforms";
import type { AdPlatformConnection } from "@/lib/types";

export async function getAdPlatformStatusAction(restaurantId: string): Promise<{
  metaConfigured: boolean;
  googleConfigured: boolean;
  connections: AdPlatformConnection[];
}> {
  const connections = restaurantId ? await getAdPlatformConnections(restaurantId) : [];
  return {
    metaConfigured: isMetaAdsConfigured(),
    googleConfigured: isGoogleAdsConfigured(),
    connections,
  };
}
