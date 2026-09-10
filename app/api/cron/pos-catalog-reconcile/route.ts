import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllActiveRestaurantIds } from "@/lib/data/weekly-reports";
import { reconcileMenuItemsForProvider, reconcileInventoryForProvider, type CatalogPosProvider } from "@/lib/pos/catalog-sync";

/**
 * Runs every 15 minutes (see vercel.json). The pull half of bidirectional
 * Clover/Square catalog sync — pushes (menu edits, stock movements) happen
 * synchronously from the menu/inventaire server actions; this cron is what
 * brings changes made directly on the POS terminal back into Minerva Flow,
 * last-write-wins (see reconcile*ForProvider in lib/pos/catalog-sync.ts).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();
  const restaurantIds = await getAllActiveRestaurantIds();

  const { data: connections } = await admin
    .from("pos_connections")
    .select("restaurant_id, provider")
    .eq("status", "connecte")
    .in("provider", ["clover", "square"])
    .in("restaurant_id", restaurantIds);

  const results = await Promise.all(
    ((connections ?? []) as { restaurant_id: string; provider: CatalogPosProvider }[]).map(async (c) => {
      const [menu, inventory] = await Promise.all([
        reconcileMenuItemsForProvider(c.restaurant_id, c.provider),
        reconcileInventoryForProvider(c.restaurant_id, c.provider),
      ]);
      return { restaurantId: c.restaurant_id, provider: c.provider, menu, inventory };
    })
  );

  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
