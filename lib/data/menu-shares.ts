import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapMenuItem, type MenuItemRow } from "@/lib/data/menu";
import type { MenuItem, MenuShare } from "@/lib/types";

type MenuShareRow = {
  id: string;
  restaurant_id: string;
  token: string;
  item_ids: string[] | null;
  title: string;
  created_at: string;
};

function mapMenuShare(row: MenuShareRow): MenuShare {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    token: row.token,
    itemIds: row.item_ids,
    title: row.title,
    createdAt: row.created_at,
  };
}

export async function getMenuSharesForRestaurant(restaurantId: string): Promise<MenuShare[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_shares")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as MenuShareRow[]).map(mapMenuShare);
}

export async function createMenuShare(
  restaurantId: string,
  input: { title: string; itemIds?: string[] | null }
): Promise<MenuShare | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const token = randomUUID().replace(/-/g, "");
  const { data, error } = await supabase
    .from("menu_shares")
    .insert({
      restaurant_id: restaurantId,
      token,
      item_ids: input.itemIds && input.itemIds.length > 0 ? input.itemIds : null,
      title: input.title,
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapMenuShare(data as MenuShareRow);
}

export async function deleteMenuShare(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_shares").delete().eq("restaurant_id", restaurantId).eq("id", id);
  return !error;
}

export type PublicMenuLanding = {
  share: MenuShare;
  restaurantId: string;
  restaurantName: string;
  taxRate: number;
  acceptsTips: boolean;
  items: MenuItem[];
};

/**
 * Public lookup — deliberately not a snapshot (unlike report_shares):
 * prices/availability change, and a shared menu link should always reflect
 * what's currently on the menu, not what it looked like the day the link
 * was generated.
 */
export async function getMenuShareByToken(token: string): Promise<PublicMenuLanding | null> {
  const admin = createAdminClient();
  const { data: shareRow } = await admin.from("menu_shares").select("*").eq("token", token).maybeSingle();
  if (!shareRow) return null;
  const share = mapMenuShare(shareRow as MenuShareRow);

  const { data: restaurantRow } = await admin
    .from("restaurants")
    .select("name, tax_rate, accepts_tips")
    .eq("id", share.restaurantId)
    .maybeSingle();
  if (!restaurantRow) return null;
  const restaurant = restaurantRow as { name: string; tax_rate: number; accepts_tips: boolean };

  let itemsQuery = admin
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", share.restaurantId)
    .eq("active", true);
  if (share.itemIds && share.itemIds.length > 0) {
    itemsQuery = itemsQuery.in("id", share.itemIds);
  }
  const { data: itemRows } = await itemsQuery.order("category").order("name");
  const items = ((itemRows as MenuItemRow[]) ?? []).map(mapMenuItem);

  return {
    share,
    restaurantId: share.restaurantId,
    restaurantName: restaurant.name,
    taxRate: restaurant.tax_rate,
    acceptsTips: restaurant.accepts_tips,
    items,
  };
}
