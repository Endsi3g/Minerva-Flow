import type { InventoryItem, RecipeItem } from "@/lib/types";

export type MenuItemStockStatus = {
  portionsAvailable: number | null;
  status: "ok" | "critique" | "rupture" | "untracked";
  limitingIngredientName?: string;
};

/**
 * Calculates theoretical portions available for a dish by crossing its recipe
 * with available inventory quantities on hand.
 * - "untracked": dish has no recipe linked
 * - "rupture": at least one required ingredient has 0 or insufficient stock (0 portions)
 * - "critique": remaining portions between 1 and 5
 * - "ok": remaining portions exceed 5
 */
export function calculateMenuItemStockStatus(
  recipes: RecipeItem[] | undefined,
  inventoryById: Map<string, InventoryItem>
): MenuItemStockStatus {
  if (!recipes || recipes.length === 0) {
    return { portionsAvailable: null, status: "untracked" };
  }

  let minPortions = Infinity;
  let limitingName = "";

  for (const r of recipes) {
    if (r.quantityPerUnit <= 0) continue;
    const inv = inventoryById.get(r.inventoryItemId);
    const qtyOnHand = inv ? inv.quantityOnHand : 0;
    const rawRatio = qtyOnHand / r.quantityPerUnit;
    // Guard against floating point rounding issues (e.g. 0.6 / 0.2 = 2.9999999999999996)
    const portions = Math.floor(Math.round(rawRatio * 1e6) / 1e6);
    if (portions < minPortions) {
      minPortions = portions;
      limitingName = inv?.name ?? "Ingrédient";
    }
  }

  if (minPortions === Infinity) {
    return { portionsAvailable: null, status: "untracked" };
  }

  const clamped = Math.max(0, minPortions);
  if (clamped <= 0) {
    return { portionsAvailable: 0, status: "rupture", limitingIngredientName: limitingName };
  }
  if (clamped <= 5) {
    return { portionsAvailable: clamped, status: "critique", limitingIngredientName: limitingName };
  }
  return { portionsAvailable: clamped, status: "ok", limitingIngredientName: limitingName };
}
