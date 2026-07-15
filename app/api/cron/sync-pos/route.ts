import { NextResponse } from "next/server";
import { getAllActiveRestaurantIds } from "@/lib/data/weekly-reports";
import { syncSquareSalesForDate } from "@/lib/pos/sync";
import { isoDaysAgo } from "@/lib/utils";

/**
 * Runs daily (see vercel.json crons config). Protected by CRON_SECRET, same
 * pattern as the other cron routes. syncSquareSalesForDate is cheap to call
 * for restaurants with no Square connection — it returns "no_token"
 * immediately without any Square API call.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const date = isoDaysAgo(1);
  const restaurantIds = await getAllActiveRestaurantIds();

  const results = await Promise.all(
    restaurantIds.map(async (restaurantId) => {
      const result = await syncSquareSalesForDate(restaurantId, date);
      return { restaurantId, ...result };
    })
  );

  return NextResponse.json({ date, results: results.filter((r) => r.status !== "no_token") });
}
