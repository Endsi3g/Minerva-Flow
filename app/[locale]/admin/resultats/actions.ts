"use server";

import { isPlatformAdmin, getPlatformShareableMetrics } from "@/lib/data/admin";
import { getRetentionFunnelMetrics, getShareableMetrics, type ShareableMetric } from "@/lib/data/retention-metrics";
import { getRestaurant } from "@/lib/data/restaurants";
import { getWorkspace } from "@/lib/data/workspaces";

export type AdminResultCardData = {
  metrics: ShareableMetric[];
  restaurantName: string;
  logoUrl: string | null;
  restaurantUrl: string;
};

/**
 * Re-checks isPlatformAdmin() itself rather than relying solely on the
 * /admin layout gate, same defense-in-depth pattern as every other admin
 * server action in this app.
 */
export async function getAdminResultCardDataAction(
  scope: "platform" | "restaurant",
  restaurantId?: string
): Promise<AdminResultCardData | null> {
  if (!(await isPlatformAdmin())) return null;

  if (scope === "platform") {
    const metrics = await getPlatformShareableMetrics("30d");
    if (!metrics) return null;
    return {
      metrics,
      restaurantName: "Minerva Flow",
      logoUrl: null,
      restaurantUrl: process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app",
    };
  }

  if (!restaurantId) return null;
  const restaurant = await getRestaurant(restaurantId);
  if (!restaurant) return null;

  const [data, workspace] = await Promise.all([
    getRetentionFunnelMetrics(restaurant.id, "30d"),
    restaurant.workspaceId ? getWorkspace(restaurant.workspaceId) : Promise.resolve(null),
  ]);

  return {
    metrics: getShareableMetrics(data),
    restaurantName: restaurant.name,
    logoUrl: workspace?.logoUrl ?? null,
    restaurantUrl: restaurant.website || process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app",
  };
}
