import { createClient } from "@/lib/supabase/server";
import type { RecipeItem } from "@/lib/types";

type RecipeItemRow = {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  inventory_item_id: string;
  quantity_per_unit: number;
  created_at: string;
};

function mapRecipeItem(row: RecipeItemRow): RecipeItem {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    menuItemId: row.menu_item_id,
    inventoryItemId: row.inventory_item_id,
    quantityPerUnit: row.quantity_per_unit,
    createdAt: row.created_at,
  };
}

/** The recipe (list of consumed inventory items) for a single menu item — powers the "Recette" section of the menu item editor. */
export async function getRecipeItems(restaurantId: string, menuItemId: string): Promise<RecipeItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("menu_item_id", menuItemId);

  if (error || !data) return [];
  return (data as RecipeItemRow[]).map(mapRecipeItem);
}

/**
 * Batch lookup keyed by menu_item_id — used by applyServedOrderEffects
 * (lib/data/orders.ts) to resolve, in one query, which inventory items (and
 * how much of each) a just-served order's line items consume.
 */
export async function getRecipeItemsForMenuItems(
  restaurantId: string,
  menuItemIds: string[]
): Promise<Map<string, RecipeItem[]>> {
  const byMenuItem = new Map<string, RecipeItem[]>();
  if (menuItemIds.length === 0) return byMenuItem;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .in("menu_item_id", menuItemIds);

  if (error || !data) return byMenuItem;
  for (const row of data as RecipeItemRow[]) {
    const item = mapRecipeItem(row);
    const list = byMenuItem.get(item.menuItemId);
    if (list) list.push(item);
    else byMenuItem.set(item.menuItemId, [item]);
  }
  return byMenuItem;
}

/**
 * Replaces the full recipe for a menu item with `items` (delete-then-insert
 * — recipes are short lists edited as a whole from the menu item form, not
 * incrementally). Passing an empty array clears the recipe, which is a
 * valid state (dish doesn't track inventory).
 */
export async function setRecipeItems(
  restaurantId: string,
  menuItemId: string,
  items: { inventoryItemId: string; quantityPerUnit: number }[]
): Promise<boolean> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("recipe_items")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("menu_item_id", menuItemId);
  if (deleteError) return false;

  const rows = items
    .filter((i) => i.inventoryItemId && i.quantityPerUnit > 0)
    .map((i) => ({
      restaurant_id: restaurantId,
      menu_item_id: menuItemId,
      inventory_item_id: i.inventoryItemId,
      quantity_per_unit: i.quantityPerUnit,
    }));
  if (rows.length === 0) return true;

  const { error: insertError } = await supabase.from("recipe_items").insert(rows);
  return !insertError;
}
