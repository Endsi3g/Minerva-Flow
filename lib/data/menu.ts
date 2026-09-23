import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/data/activity";
import { notifyFavoritedItemAvailable } from "@/lib/favorites/notify";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuItem } from "@/lib/types";

export type MenuItemRow = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  price: number;
  food_cost: number;
  units_sold: number;
  active: boolean;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  is_draft?: boolean;
  allergens?: string[];
  allergens_confirmed?: boolean;
  created_at: string;
  updated_at: string;
};

export function mapMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    category: row.category,
    price: row.price,
    foodCost: row.food_cost,
    unitsSold: row.units_sold,
    active: row.active,
    description: row.description,
    imageUrl: row.image_url,
    imageUrls: row.image_urls ?? [],
    videoUrl: row.video_url ?? null,
    isDraft: row.is_draft ?? false,
    allergens: row.allergens ?? [],
    allergensConfirmed: row.allergens_confirmed ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeAllergens(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean).map((value) => value.slice(0, 80)))].slice(0, 50);
}

export async function getMenuItems(restaurantId: string, client?: SupabaseClient): Promise<MenuItem[]> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("category")
    .order("name");

  if (error || !data) return [];
  return (data as MenuItemRow[]).map(mapMenuItem);
}

/**
 * Active menu items for customer-facing surfaces (portal, public menu
 * links) — uses the admin client because menu_items_select RLS requires
 * is_restaurant_member, which a loyalty customer never is. Same
 * active-only, admin-client shape as getMenuShareByToken in
 * lib/data/menu-shares.ts, so this and the public menu-share page can
 * never drift into showing different items for the same restaurant.
 */
export async function getActiveMenuItemsForCustomers(restaurantId: string): Promise<MenuItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("active", true)
    .order("category")
    .order("name");

  if (error || !data) return [];
  return (data as MenuItemRow[]).map(mapMenuItem);
}

export type MenuItemInput = {
  name: string;
  category?: string | null;
  price: number;
  foodCost: number;
  description?: string | null;
  active?: boolean;
  imageUrl?: string | null;
  videoUrl?: string | null;
  isDraft?: boolean;
  allergens?: string[];
  allergensConfirmed?: boolean;
};

export async function createMenuItem(restaurantId: string, input: MenuItemInput): Promise<MenuItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      category: input.category ?? null,
      price: input.price,
      food_cost: input.foodCost,
      description: input.description ?? null,
      active: input.isDraft ? false : (input.active ?? true),
      is_draft: input.isDraft ?? false,
      allergens: normalizeAllergens(input.allergens),
      allergens_confirmed: input.allergensConfirmed ?? false,
      image_url: input.imageUrl ?? null,
      video_url: input.videoUrl ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (error) console.error("createMenuItem failed:", error.message);
    return null;
  }

  await logActivity({
    restaurantId,
    actionType: "menu_item.create",
    entityType: "menu_item",
    entityId: data.id,
    description: `A ajouté le plat "${input.name}" au menu`,
  });

  return mapMenuItem(data as MenuItemRow);
}

/**
 * Bulk insert (e.g. from the PDF menu-scan import review screen) — one
 * activity-log entry for the whole batch instead of one per item, unlike
 * createMenuItem, since importing 30 items shouldn't spam the feed 30 times.
 */
export async function createMenuItems(restaurantId: string, inputs: MenuItemInput[]): Promise<MenuItem[]> {
  if (inputs.length === 0) return [];
  const supabase = await createClient();
  const rows = inputs.map((input) => ({
    restaurant_id: restaurantId,
    name: input.name,
    category: input.category ?? null,
    price: input.price,
    food_cost: input.foodCost,
    description: input.description ?? null,
    active: input.isDraft ? false : (input.active ?? true),
    is_draft: input.isDraft ?? false,
    allergens: normalizeAllergens(input.allergens),
    allergens_confirmed: input.allergensConfirmed ?? false,
    image_url: input.imageUrl ?? null,
    video_url: input.videoUrl ?? null,
  }));

  const { data, error } = await supabase.from("menu_items").insert(rows).select("*");
  if (error || !data) {
    if (error) console.error("createMenuItems failed:", error.message);
    return [];
  }

  await logActivity({
    restaurantId,
    actionType: "menu_item.create",
    entityType: "menu_item",
    entityId: (data[0] as MenuItemRow).id,
    description: `A importé ${data.length} plat${data.length > 1 ? "s" : ""} au menu depuis un PDF`,
  });

  return (data as MenuItemRow[]).map(mapMenuItem);
}

export async function updateMenuItem(
  restaurantId: string,
  id: string,
  patch: Partial<MenuItemInput>
): Promise<MenuItem | null> {
  const supabase = await createClient();

  // Only worth a pre-read when this update might actually flip the item
  // back on — that's the one transition favorited-item alerts fire for.
  let wasInactive = false;
  let currentDraft = false;
  if (patch.active === true) {
    const { data: current, error: currentError } = await supabase
      .from("menu_items")
      .select("active, is_draft, price, allergens_confirmed")
      .eq("restaurant_id", restaurantId)
      .eq("id", id)
      .maybeSingle();
    if (currentError || !current) return null;
    const currentRow = current as { active: boolean; is_draft: boolean; price: number; allergens_confirmed: boolean };
    currentDraft = currentRow.is_draft;
    if (currentDraft && (!(Number(currentRow.price) > 0) || !currentRow.allergens_confirmed)) return null;
    wasInactive = currentRow.active === false;
  }

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.foodCost !== undefined) dbPatch.food_cost = patch.foodCost;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.active !== undefined) dbPatch.active = patch.active;
  if (patch.imageUrl !== undefined) dbPatch.image_url = patch.imageUrl;
  if (patch.videoUrl !== undefined) dbPatch.video_url = patch.videoUrl;
  if (patch.isDraft !== undefined) dbPatch.is_draft = patch.isDraft;
  else if (patch.active === true && currentDraft) dbPatch.is_draft = false;
  if (patch.allergens !== undefined) dbPatch.allergens = normalizeAllergens(patch.allergens);
  if (patch.allergensConfirmed !== undefined) dbPatch.allergens_confirmed = patch.allergensConfirmed;

  const { data, error } = await supabase
    .from("menu_items")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;
  const item = mapMenuItem(data as MenuItemRow);

  if (wasInactive) {
    await notifyFavoritedItemAvailable(supabase, restaurantId, "menu_item", item.id, item.name).catch(() => {
      // Best-effort — a failed alert must not roll back the availability change staff just made.
    });
  }

  return item;
}

export async function deleteMenuItem(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("restaurant_id", restaurantId).eq("id", id);
  return !error;
}

/**
 * Bumps a menu item's cumulative units_sold counter — the "+ ventes" quick
 * action. Atomic (see migration) so two concurrent sale logs on the same
 * item can't lose an increment.
 */
export async function recordSale(restaurantId: string, id: string, quantity: number): Promise<MenuItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("increment_menu_item_sales", {
    p_item_id: id,
    p_quantity: quantity,
  });

  if (error || !data || (data as MenuItemRow[]).length === 0) return null;
  const row = (data as MenuItemRow[])[0];
  if (row.restaurant_id !== restaurantId) return null;
  return mapMenuItem(row);
}

export { calculateMenuItemStockStatus, type MenuItemStockStatus } from "@/lib/stock-availability";
