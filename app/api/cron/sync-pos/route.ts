import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllActiveRestaurantIds } from "@/lib/data/weekly-reports";
import { syncPosSalesForDate } from "@/lib/pos/sync";
import type { PosProvider } from "@/lib/data/pos-connections";
import { isoDaysAgo } from "@/lib/utils";

/**
 * Runs daily (see vercel.json crons config). Protected by CRON_SECRET, same
 * pattern as the other cron routes. Provider-agnostic: fans out over every
 * restaurant's *connected* pos_connections rows (status = 'connecte'), not
 * just Square, and dispatches each through syncPosSalesForDate — adding
 * Clover later needs no change here, only a syncPosSalesForDate branch.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const date = isoDaysAgo(1);
  const restaurantIds = await getAllActiveRestaurantIds();

  const { data: connections } = await admin
    .from("pos_connections")
    .select("restaurant_id, provider")
    .eq("status", "connecte")
    .in("restaurant_id", restaurantIds);

  const results = await Promise.all(
    ((connections ?? []) as { restaurant_id: string; provider: PosProvider }[]).map(async (c) => {
      const result = await syncPosSalesForDate(c.provider, c.restaurant_id, date);
      return { restaurantId: c.restaurant_id, provider: c.provider, ...result };
    })
  );

  return NextResponse.json({ date, results: results.filter((r) => r.status !== "no_token") });
}
