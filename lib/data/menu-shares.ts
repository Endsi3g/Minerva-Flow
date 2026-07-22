import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/tokens";
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

  const token = generateToken();
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

  if (error || !data) {
    if (error) console.error("createMenuShare failed:", error.message);
    return null;
  }
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
  onlinePaymentEnabled: boolean;
  items: MenuItem[];
};

type ConnectAvailability = { onlinePaymentEnabled: boolean; stripeConnectAccountId: string | null };

/**
 * Deliberately a separate query from the core tax_rate/accepts_tips
 * lookup below, and deliberately swallows its own error instead of
 * failing the caller: the stripe_connect_* columns are new (migration
 * 0026) and this function is on the same request path as the
 * already-live public ordering flow — if the migration hasn't been
 * applied yet in some environment, online payment should just look
 * unavailable, not take down menu browsing/ordering entirely.
 */
async function getConnectPaymentAvailability(
  admin: ReturnType<typeof createAdminClient>,
  restaurantId: string
): Promise<ConnectAvailability> {
  const fallback: ConnectAvailability = { onlinePaymentEnabled: false, stripeConnectAccountId: null };
  const { data, error } = await admin
    .from("restaurants")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", restaurantId)
    .maybeSingle();
  if (error || !data) return fallback;
  const row = data as { stripe_connect_account_id: string | null; stripe_connect_charges_enabled: boolean };
  return {
    onlinePaymentEnabled: Boolean(row.stripe_connect_account_id) && row.stripe_connect_charges_enabled,
    stripeConnectAccountId: row.stripe_connect_account_id,
  };
}

/**
 * Shared by getMenuShareByToken and submitPublicOrder
 * (lib/data/customer-referrals.ts) — the same function feeds both the
 * public page's display AND the authoritative payment-creation check, so
 * the two can never disagree about whether online payment is available.
 */
export async function getRestaurantOrderSettings(
  admin: ReturnType<typeof createAdminClient>,
  restaurantId: string
): Promise<{
  taxRate: number;
  acceptsTips: boolean;
  onlinePaymentEnabled: boolean;
  stripeConnectAccountId: string | null;
} | null> {
  const [{ data }, connect] = await Promise.all([
    admin.from("restaurants").select("tax_rate, accepts_tips").eq("id", restaurantId).maybeSingle(),
    getConnectPaymentAvailability(admin, restaurantId),
  ]);
  if (!data) return null;
  const row = data as { tax_rate: number; accepts_tips: boolean };
  return { taxRate: row.tax_rate, acceptsTips: row.accepts_tips, ...connect };
}

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

  let itemsQuery = admin
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", share.restaurantId)
    .eq("active", true);
  if (share.itemIds && share.itemIds.length > 0) {
    itemsQuery = itemsQuery.in("id", share.itemIds);
  }

  const [restaurantResult, itemsResult, connect] = await Promise.all([
    admin.from("restaurants").select("name, tax_rate, accepts_tips").eq("id", share.restaurantId).maybeSingle(),
    itemsQuery.order("category").order("name"),
    getConnectPaymentAvailability(admin, share.restaurantId),
  ]);

  if (!restaurantResult.data) return null;
  const restaurant = restaurantResult.data as { name: string; tax_rate: number; accepts_tips: boolean };
  const items = ((itemsResult.data as MenuItemRow[]) ?? []).map(mapMenuItem);

  return {
    share,
    restaurantId: share.restaurantId,
    restaurantName: restaurant.name,
    taxRate: restaurant.tax_rate,
    acceptsTips: restaurant.accepts_tips,
    onlinePaymentEnabled: connect.onlinePaymentEnabled,
    items,
  };
}
