import { getGoogleTokens } from "@/lib/data/google-connections";
import type { AdChannel } from "@/lib/types";

const GA4_BASE_URL = "https://analyticsdata.googleapis.com/v1beta";

export type GA4ConversionRow = {
  city: string | null;
  channel: AdChannel;
  convertedOnline: boolean;
  revenue: number;
};

function channelFromGroup(group: string): AdChannel {
  const normalized = group.toLowerCase();
  if (normalized.includes("organic")) return "organic";
  if (normalized.includes("google") || normalized.includes("paid search")) return "google";
  if (normalized.includes("social") || normalized.includes("meta") || normalized.includes("facebook") || normalized.includes("instagram")) {
    return "meta";
  }
  return "organic";
}

/**
 * Pulls conversion rows from the GA4 Data API for a date range, grouped by
 * city + channel. No geocoding step — GA4 only gives a city name, not
 * coordinates, so rows without a known lat/lng (resolved by the caller,
 * see app/api/cron/sync-analytics/route.ts) simply don't render as map
 * points, but still count toward the sidebar totals.
 */
export async function getOnlineConversions(
  restaurantId: string,
  propertyId: string,
  { from, to }: { from: string; to: string }
): Promise<GA4ConversionRow[]> {
  const tokens = await getGoogleTokens(restaurantId);
  if (!tokens) return [];

  const res = await fetch(`${GA4_BASE_URL}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: "city" }, { name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "conversions" }, { name: "totalRevenue" }],
    }),
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[];
  };

  return (data.rows ?? [])
    .map((row) => {
      const conversions = Number(row.metricValues[0]?.value ?? 0);
      const revenue = Number(row.metricValues[1]?.value ?? 0);
      if (conversions <= 0) return null;
      return {
        city: row.dimensionValues[0]?.value || null,
        channel: channelFromGroup(row.dimensionValues[1]?.value ?? ""),
        convertedOnline: true,
        revenue,
      };
    })
    .filter((r): r is GA4ConversionRow => r !== null);
}
