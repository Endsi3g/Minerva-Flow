"use server";

import { revalidatePath } from "next/cache";
import { getSuppliers, createSupplier, deleteSupplier, type SupplierInput } from "@/lib/data/suppliers";
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  recordPurchaseOrderItemReceipts,
  type PurchaseOrderInput,
} from "@/lib/data/purchase-orders";
import { receivePurchaseOrderItems } from "@/lib/data/inventory";
import { createFinancialTransaction } from "@/lib/data/finance";
import { notifyRestaurant } from "@/lib/data/notifications";
import {
  calculateReorders,
  generatePurchaseOrdersFromSuggestions,
  type SuggestedReorderGroup,
} from "@/lib/engine/reorder";
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from "@/lib/types";

export async function getSuppliersAction(restaurantId: string): Promise<Supplier[]> {
  if (!restaurantId) return [];
  return getSuppliers(restaurantId);
}

export async function createSupplierAction(
  restaurantId: string,
  input: SupplierInput
): Promise<Supplier | null> {
  if (!input.name.trim()) return null;
  const supplier = await createSupplier(restaurantId, input);
  if (supplier) revalidatePath("/fournisseurs");
  return supplier;
}

export async function deleteSupplierAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteSupplier(restaurantId, id);
  if (ok) revalidatePath("/fournisseurs");
  return ok;
}

export async function getPurchaseOrdersAction(restaurantId: string): Promise<PurchaseOrder[]> {
  if (!restaurantId) return [];
  return getPurchaseOrders(restaurantId);
}

export async function createPurchaseOrderAction(
  restaurantId: string,
  input: PurchaseOrderInput
): Promise<PurchaseOrder | null> {
  const order = await createPurchaseOrder(restaurantId, input);
  if (order) revalidatePath("/fournisseurs");
  return order;
}

export type UpdatePurchaseOrderStatusResult = {
  ok: boolean;
  unmatchedItemNames?: string[];
  /** Total cost of a just-received order (sum of quantity × unitCost), so the
   * UI can offer to log it as a Finance expense — not done automatically,
   * since a restaurant that later reconciles a bank feed for the same
   * supplier payment would otherwise get it double-counted. */
  receivedTotalCost?: number;
};

export async function updatePurchaseOrderStatusAction(
  restaurantId: string,
  id: string,
  status: PurchaseOrderStatus,
  itemReceipts?: { itemId: string; receivedQuantity: number }[]
): Promise<UpdatePurchaseOrderStatusResult> {
  const result = await updatePurchaseOrderStatus(restaurantId, id, status);
  if (!result.ok) return { ok: false };

  revalidatePath("/fournisseurs");
  if (status === "envoyee") {
    await notifyRestaurant({
      restaurantId,
      type: "purchase_order.sent",
      title: "Commande fournisseur envoyée",
      link: "/fournisseurs",
    });
  }

  // Only the request that actually flipped envoyee -> recue processes
  // receipt — a duplicate/concurrent request racing on the same PO returns
  // ok:true without re-incrementing stock a second time.
  if (status === "recue" && result.transitioned) {
    if (itemReceipts && itemReceipts.length > 0) {
      await recordPurchaseOrderItemReceipts(id, itemReceipts);
    }

    const order = await getPurchaseOrder(restaurantId, id);
    if (order && order.items.length > 0) {
      const receiptMap = new Map(itemReceipts?.map((r) => [r.itemId, r.receivedQuantity]) ?? []);

      const itemsToReceive = order.items.map((i) => {
        const receivedQty = receiptMap.has(i.id) ? receiptMap.get(i.id)! : i.quantity;
        return {
          inventoryItemId: i.inventoryItemId,
          itemName: i.itemName,
          quantity: receivedQty,
        };
      });

      const { matchedCount, unmatchedNames } = await receivePurchaseOrderItems(
        restaurantId,
        itemsToReceive
      );

      if (matchedCount > 0) revalidatePath("/inventaire");

      const receivedTotalCost = order.items.reduce((sum, i) => {
        const receivedQty = receiptMap.has(i.id) ? receiptMap.get(i.id)! : i.quantity;
        return sum + receivedQty * i.unitCost;
      }, 0);

      if (unmatchedNames.length > 0) {
        return { ok: true, unmatchedItemNames: unmatchedNames, receivedTotalCost };
      }
      return { ok: true, receivedTotalCost };
    }
  }
  return { ok: true };
}

/**
 * Opt-in logging of a received purchase order's total cost as a Finance
 * expense — a deliberate click from the "Enregistrer comme dépense ?" toast
 * offered right after receiving, never automatic (see receivedTotalCost).
 */
export async function logPurchaseOrderExpenseAction(restaurantId: string, purchaseOrderId: string): Promise<boolean> {
  const order = await getPurchaseOrder(restaurantId, purchaseOrderId);
  if (!order || order.items.length === 0) return false;

  const totalCost = order.items.reduce((sum, i) => {
    const qty = i.receivedQuantity != null ? i.receivedQuantity : i.quantity;
    return sum + qty * i.unitCost;
  }, 0);
  if (totalCost <= 0) return false;

  const suppliers = await getSuppliers(restaurantId);
  const supplierName = suppliers.find((s) => s.id === order.supplierId)?.name ?? "fournisseur";

  const transaction = await createFinancialTransaction(restaurantId, {
    date: new Date().toISOString().slice(0, 10),
    description: `Commande reçue — ${supplierName}`,
    amount: totalCost,
    direction: "out",
    category: "Fournisseurs",
    sourceAccount: "Commande fournisseur",
  });

  if (transaction) revalidatePath("/finance");
  return Boolean(transaction);
}

export async function deletePurchaseOrderAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deletePurchaseOrder(restaurantId, id);
  if (ok) revalidatePath("/fournisseurs");
  return ok;
}

export async function getSuggestedReordersAction(restaurantId: string): Promise<SuggestedReorderGroup[]> {
  if (!restaurantId) return [];
  return calculateReorders(restaurantId);
}

export async function generateSuggestedPurchaseOrdersAction(
  restaurantId: string,
  suggestions: SuggestedReorderGroup[]
): Promise<{ count: number; skippedNoSupplierCount: number }> {
  if (!restaurantId || suggestions.length === 0) return { count: 0, skippedNoSupplierCount: 0 };
  const { createdOrders, skippedNoSupplierCount } = await generatePurchaseOrdersFromSuggestions(
    restaurantId,
    suggestions
  );
  if (createdOrders.length > 0) {
    revalidatePath("/fournisseurs");
    revalidatePath("/inventaire");
  }
  return { count: createdOrders.length, skippedNoSupplierCount };
}
