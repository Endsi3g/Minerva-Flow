import { getInventoryItems } from "@/lib/data/inventory";
import { getSuppliers } from "@/lib/data/suppliers";
import { createPurchaseOrder } from "@/lib/data/purchase-orders";
import type { InventoryItem, Supplier, PurchaseOrder } from "@/lib/types";

export type SuggestedReorderItem = {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  unitCost: number;
  quantityOnHand: number;
  parLevel: number;
  suggestedQuantity: number;
  estimatedCost: number;
};

export type SuggestedReorderGroup = {
  supplierId: string | null;
  supplierName: string;
  supplierEmail: string | null;
  supplierPhone: string | null;
  items: SuggestedReorderItem[];
  totalEstimatedCost: number;
};

/**
 * Calculates replenishment needs across all inventory items for a restaurant:
 * Identifies items where quantity_on_hand <= par_level, computes the required
 * replenishment quantity to reach par_level, and groups them by assigned supplier.
 */
export async function calculateReorders(restaurantId: string): Promise<SuggestedReorderGroup[]> {
  const [inventory, suppliers] = await Promise.all([
    getInventoryItems(restaurantId),
    getSuppliers(restaurantId),
  ]);

  const supplierMap = new Map<string, Supplier>(suppliers.map((s) => [s.id, s]));

  // Find all items below or equal to their par level
  const deficitItems = inventory.filter(
    (item) => item.parLevel != null && item.quantityOnHand <= item.parLevel
  );

  if (deficitItems.length === 0) return [];

  // Group by supplier_id
  const groupsMap = new Map<string | null, SuggestedReorderItem[]>();

  for (const item of deficitItems) {
    const par = item.parLevel!;
    const needed = Math.max(1, Math.round((par - item.quantityOnHand) * 100) / 100);
    const cost = Math.round(needed * item.unitCost * 100) / 100;

    const reorderItem: SuggestedReorderItem = {
      inventoryItemId: item.id,
      itemName: item.name,
      unit: item.unit,
      unitCost: item.unitCost,
      quantityOnHand: item.quantityOnHand,
      parLevel: par,
      suggestedQuantity: needed,
      estimatedCost: cost,
    };

    const key = item.supplierId ?? null;
    const existing = groupsMap.get(key) ?? [];
    existing.push(reorderItem);
    groupsMap.set(key, existing);
  }

  const result: SuggestedReorderGroup[] = [];

  for (const [supplierId, items] of groupsMap.entries()) {
    const supplier = supplierId ? supplierMap.get(supplierId) : null;
    const totalCost = items.reduce((sum, i) => sum + i.estimatedCost, 0);

    result.push({
      supplierId,
      supplierName: supplier?.name ?? "Sans fournisseur assigné",
      supplierEmail: supplier?.email ?? null,
      supplierPhone: supplier?.phone ?? null,
      items,
      totalEstimatedCost: Math.round(totalCost * 100) / 100,
    });
  }

  // Sort groups: suppliers with assigned items first, then by total estimated cost descending
  return result.sort((a, b) => {
    if (a.supplierId && !b.supplierId) return -1;
    if (!a.supplierId && b.supplierId) return 1;
    return b.totalEstimatedCost - a.totalEstimatedCost;
  });
}

/**
 * Creates draft purchase orders for groups that have an assigned supplier.
 * Items without an assigned supplier cannot produce an automated PO until a supplier is assigned.
 */
export async function generatePurchaseOrdersFromSuggestions(
  restaurantId: string,
  suggestions: SuggestedReorderGroup[]
): Promise<{ createdOrders: PurchaseOrder[]; skippedNoSupplierCount: number }> {
  const createdOrders: PurchaseOrder[] = [];
  let skippedNoSupplierCount = 0;

  for (const group of suggestions) {
    if (!group.supplierId) {
      skippedNoSupplierCount += group.items.length;
      continue;
    }

    const order = await createPurchaseOrder(restaurantId, {
      supplierId: group.supplierId,
      expectedDate: null,
      notes: "Généré automatiquement par le moteur de réapprovisionnement Minerva Flow",
      items: group.items.map((i) => ({
        inventoryItemId: i.inventoryItemId,
        itemName: i.itemName,
        quantity: i.suggestedQuantity,
        unit: i.unit,
        unitCost: i.unitCost,
      })),
    });

    if (order) {
      createdOrders.push(order);
    }
  }

  return { createdOrders, skippedNoSupplierCount };
}
