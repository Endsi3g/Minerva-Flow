import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * "Populaire près de vous" — the most-ordered menu items across every
 * discoverable restaurant (any restaurant with lat/lng, same universe as
 * /api/portal/discover), ranked by real order_items.quantity, not a
 * vanity metric. Aggregation happens here in JS rather than a SQL
 * function: the dataset is small enough that a second round-trip isn't
 * worth a new RPC, and this stays consistent with every other bridge
 * route's plain-query style. Excludes cancelled orders — a cancelled
 * order was never actually fulfilled, so it shouldn't count as "popular".
 */
export async function GET(req: Request) {
  const userId = await resolveNativeUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: restaurants } = await admin
    .from("restaurants")
    .select("id, name")
    .not("lat", "is", null)
    .not("lng", "is", null);

  const restaurantIds = (restaurants ?? []).map((r) => r.id as string);
  if (restaurantIds.length === 0) {
    return NextResponse.json({ items: [] });
  }
  const nameByRestaurantId = new Map((restaurants ?? []).map((r) => [r.id as string, r.name as string]));

  const { data: orders } = await admin
    .from("orders")
    .select("id")
    .in("restaurant_id", restaurantIds)
    .neq("status", "annulee");

  const orderIds = (orders ?? []).map((o) => o.id as string);
  if (orderIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const { data: orderItems } = await admin
    .from("order_items")
    .select("order_id, menu_item_id, quantity")
    .in("order_id", orderIds);

  const qtyByMenuItemId = new Map<string, number>();
  for (const row of orderItems ?? []) {
    const menuItemId = row.menu_item_id as string | null;
    if (!menuItemId) continue;
    qtyByMenuItemId.set(menuItemId, (qtyByMenuItemId.get(menuItemId) ?? 0) + (row.quantity as number));
  }

  const topMenuItemIds = [...qtyByMenuItemId.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  if (topMenuItemIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const { data: menuItems } = await admin
    .from("menu_items")
    .select("id, restaurant_id, name, price, image_url, image_urls, category")
    .in("id", topMenuItemIds)
    .eq("active", true);

  const items = (menuItems ?? [])
    .map((item) => ({
      id: item.id as string,
      name: item.name as string,
      price: item.price as number,
      imageUrl: (item.image_urls as string[] | null)?.[0] ?? (item.image_url as string | null),
      category: item.category as string | null,
      restaurantId: item.restaurant_id as string,
      restaurantName: nameByRestaurantId.get(item.restaurant_id as string) ?? "Restaurant",
      orderCount: qtyByMenuItemId.get(item.id as string) ?? 0,
    }))
    .sort((a, b) => b.orderCount - a.orderCount);

  return NextResponse.json({ items });
}
