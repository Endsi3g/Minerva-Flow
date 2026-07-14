import { NextResponse } from "next/server";
import { getAllActiveRestaurantIds } from "@/lib/data/weekly-reports";
import { getGoogleConnection, hasGoogleScope } from "@/lib/data/google-connections";
import { getOnlineConversions } from "@/lib/google/analytics";
import { replaceTodayAdConversions } from "@/lib/data/ad-platforms";

/** Yesterday's date range, in UTC — matches how GA4 typically finalizes a day's data. */
function yesterdayRange(now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().slice(0, 10);
  return { from: date, to: date };
}

/**
 * Runs daily (see vercel.json crons config). Protected by CRON_SECRET, same
 * pattern as the weekly-report cron.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { from, to } = yesterdayRange();
  const restaurantIds = await getAllActiveRestaurantIds();

  const results = await Promise.all(
    restaurantIds.map(async (restaurantId) => {
      const enabled = await hasGoogleScope(restaurantId, "analytics");
      if (!enabled) return { restaurantId, status: "skipped_no_scope" };

      const connection = await getGoogleConnection(restaurantId);
      if (!connection?.ga4PropertyId) return { restaurantId, status: "skipped_no_property_id" };

      const rows = await getOnlineConversions(restaurantId, connection.ga4PropertyId, { from, to });
      await replaceTodayAdConversions(restaurantId, rows);

      return { restaurantId, status: "synced", count: rows.length };
    })
  );

  return NextResponse.json({ from, to, results });
}
