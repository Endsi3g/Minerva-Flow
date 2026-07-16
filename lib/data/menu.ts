import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { MenuItem } from "@/lib/types";

type MenuItemRow = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  price: number;
  food_cost: number;
  units_sold: number;
  active: boolean;
  description: string | null;
  created_at: string;
};

function mapMenuItem(row: MenuItemRow): MenuItem {
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
    createdAt: row.created_at,
  };
}

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
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
      active: input.active ?? true,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "menu_item.create",
    entityType: "menu_item",
    entityId: data.id,
    description: `A ajouté le plat "${input.name}" au menu`,
  });

  return mapMenuItem(data as MenuItemRow);
}

export async function updateMenuItem(
  restaurantId: string,
  id: string,
  patch: Partial<MenuItemInput>
): Promise<MenuItem | null> {
  const supabase = await createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.foodCost !== undefined) dbPatch.food_cost = patch.foodCost;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.active !== undefined) dbPatch.active = patch.active;

  const { data, error } = await supabase
    .from("menu_items")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapMenuItem(data as MenuItemRow);
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
