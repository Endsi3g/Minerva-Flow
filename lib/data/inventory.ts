import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { createFinancialTransaction } from "@/lib/data/finance";
import type { InventoryItem, InventoryMovement, InventoryMovementType } from "@/lib/types";

type InventoryItemRow = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  unit: string;
  quantity_on_hand: number;
  par_level: number | null;
  unit_cost: number;
  supplier_id: string | null;
  created_at: string;
};

type InventoryMovementRow = {
  id: string;
  inventory_item_id: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

function mapItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantityOnHand: row.quantity_on_hand,
    parLevel: row.par_level,
    unitCost: row.unit_cost,
    supplierId: row.supplier_id,
    createdAt: row.created_at,
  };
}

function mapMovement(row: InventoryMovementRow): InventoryMovement {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    type: row.type,
    quantity: row.quantity,
    reason: row.reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function getInventoryItems(restaurantId: string): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("category")
    .order("name");

  if (error || !data) return [];
  return (data as InventoryItemRow[]).map(mapItem);
}

export type InventoryItemInput = {
  name: string;
  category?: string | null;
  unit: string;
  quantityOnHand?: number;
  parLevel?: number | null;
  unitCost: number;
  supplierId?: string | null;
};

export async function createInventoryItem(
  restaurantId: string,
  input: InventoryItemInput
): Promise<InventoryItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      category: input.category ?? null,
      unit: input.unit,
      quantity_on_hand: input.quantityOnHand ?? 0,
      par_level: input.parLevel ?? null,
      unit_cost: input.unitCost,
      supplier_id: input.supplierId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "inventory_item.create",
    entityType: "inventory_item",
    entityId: data.id,
    description: `A ajouté "${input.name}" à l'inventaire`,
  });

  return mapItem(data as InventoryItemRow);
}

export async function updateInventoryItem(
  restaurantId: string,
  id: string,
  patch: Partial<InventoryItemInput>
): Promise<InventoryItem | null> {
  const supabase = await createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.unit !== undefined) dbPatch.unit = patch.unit;
  if (patch.parLevel !== undefined) dbPatch.par_level = patch.parLevel;
  if (patch.unitCost !== undefined) dbPatch.unit_cost = patch.unitCost;
  if (patch.supplierId !== undefined) dbPatch.supplier_id = patch.supplierId;

  const { data, error } = await supabase
    .from("inventory_items")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapItem(data as InventoryItemRow);
}

export async function deleteInventoryItem(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

export async function getInventoryMovements(itemId: string): Promise<InventoryMovement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("inventory_item_id", itemId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as InventoryMovementRow[]).map(mapMovement);
}

/**
 * Logs a stock movement and updates the item's quantity_on_hand
 * (reception/ajustement add, utilisation/gaspillage subtract). When the
 * movement is waste, also writes a "Gaspillage" financial_transaction
 * (lib/data/finance.ts) so the cost shows up automatically in
 * Finance/Dépenses and the existing category-breakdown reports, instead of
 * duplicating that aggregation here.
 */
export async function logMovement(
  restaurantId: string,
  itemId: string,
  type: InventoryMovementType,
  quantity: number,
  reason?: string | null
): Promise<InventoryItem | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: itemRow } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", itemId)
    .maybeSingle();

  if (!itemRow) return null;
  const item = itemRow as InventoryItemRow;

  const delta = type === "reception" || type === "ajustement" ? quantity : -quantity;

  const { error: movementError } = await supabase.from("inventory_movements").insert({
    inventory_item_id: itemId,
    type,
    quantity,
    reason: reason ?? null,
    created_by: user?.id ?? null,
  });

  if (movementError) return null;

  // Atomic increment (see migration) — two concurrent movements on the
  // same item (e.g. a delivery logged while someone else logs waste) can no
  // longer overwrite each other's quantity_on_hand change.
  const { data: rpcRows, error: rpcError } = await supabase.rpc("increment_inventory_quantity", {
    p_item_id: itemId,
    p_delta: delta,
  });

  if (rpcError || !rpcRows || (rpcRows as InventoryItemRow[]).length === 0) return null;
  const updated = (rpcRows as InventoryItemRow[])[0];

  await logActivity({
    restaurantId,
    actionType: "inventory_item.movement",
    entityType: "inventory_item",
    entityId: itemId,
    description: `A enregistré un mouvement (${type}) de ${quantity} ${item.unit} sur "${item.name}"`,
  });

  if (type === "gaspillage") {
    const cost = quantity * item.unit_cost;
    if (cost > 0) {
      await createFinancialTransaction(restaurantId, {
        date: new Date().toISOString().slice(0, 10),
        description: `Gaspillage : ${item.name}${reason ? ` (${reason})` : ""}`,
        amount: cost,
        direction: "out",
        category: "Gaspillage",
        sourceAccount: "Inventaire",
      });
    }
  }

  return mapItem(updated as InventoryItemRow);
}

/**
 * Aggregates waste cost (quantity × unit_cost at time of query) per item
 * over a date range, ranked highest-cost first — powers the "Gaspillage"
 * summary card on /inventaire.
 */
export async function getWasteSummary(
  restaurantId: string,
  opts?: { from?: string; to?: string }
): Promise<{ itemId: string; itemName: string; cost: number }[]> {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, name, unit_cost")
    .eq("restaurant_id", restaurantId);

  const itemRows = (items as { id: string; name: string; unit_cost: number }[]) ?? [];
  if (itemRows.length === 0) return [];
  const itemById = new Map(itemRows.map((i) => [i.id, i]));

  let query = supabase
    .from("inventory_movements")
    .select("inventory_item_id, quantity, created_at")
    .eq("type", "gaspillage")
    .in("inventory_item_id", itemRows.map((i) => i.id));

  if (opts?.from) query = query.gte("created_at", opts.from);
  if (opts?.to) query = query.lte("created_at", opts.to);

  const { data: movements } = await query;
  const costByItem = new Map<string, number>();
  for (const m of (movements as { inventory_item_id: string; quantity: number }[]) ?? []) {
    const item = itemById.get(m.inventory_item_id);
    if (!item) continue;
    costByItem.set(m.inventory_item_id, (costByItem.get(m.inventory_item_id) ?? 0) + m.quantity * item.unit_cost);
  }

  return Array.from(costByItem.entries())
    .map(([itemId, cost]) => ({ itemId, itemName: itemById.get(itemId)!.name, cost }))
    .sort((a, b) => b.cost - a.cost);
}

/**
 * Best-effort receiving: purchase_order_items.item_name and
 * inventory_items.name are both free text with no shared id (no picker UI
 * exists yet to link them explicitly), so a delivered purchase order is
 * matched to inventory items by case-insensitive exact name within the
 * restaurant. Unmatched lines are silently skipped rather than erroring —
 * this is a convenience, not a guarantee every order line is stocked.
 */
export async function receivePurchaseOrderItems(
  restaurantId: string,
  items: { itemName: string; quantity: number }[]
): Promise<number> {
  if (items.length === 0) return 0;
  const inventoryItems = await getInventoryItems(restaurantId);
  const byName = new Map(inventoryItems.map((i) => [i.name.trim().toLowerCase(), i]));

  let matched = 0;
  for (const item of items) {
    const match = byName.get(item.itemName.trim().toLowerCase());
    if (!match) continue;
    const updated = await logMovement(
      restaurantId,
      match.id,
      "reception",
      item.quantity,
      "Réception d'une commande fournisseur"
    );
    if (updated) matched++;
  }
  return matched;
}
