"use server";

import { revalidatePath } from "next/cache";
import { getSuppliers, createSupplier, deleteSupplier, type SupplierInput } from "@/lib/data/suppliers";
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  type PurchaseOrderInput,
} from "@/lib/data/purchase-orders";
import { receivePurchaseOrderItems } from "@/lib/data/inventory";
import { notifyRestaurant } from "@/lib/data/notifications";
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

export async function updatePurchaseOrderStatusAction(
  restaurantId: string,
  id: string,
  status: PurchaseOrderStatus
): Promise<boolean> {
  const ok = await updatePurchaseOrderStatus(restaurantId, id, status);
  if (ok) {
    revalidatePath("/fournisseurs");
    if (status === "envoyee") {
      await notifyRestaurant({
        restaurantId,
        type: "purchase_order.sent",
        title: "Commande fournisseur envoyée",
        link: "/fournisseurs",
      });
    }
    if (status === "recue") {
      const order = await getPurchaseOrder(restaurantId, id);
      if (order && order.items.length > 0) {
        const matched = await receivePurchaseOrderItems(
          restaurantId,
          order.items.map((i) => ({ itemName: i.itemName, quantity: i.quantity }))
        );
        if (matched > 0) revalidatePath("/inventaire");
      }
    }
  }
  return ok;
}

export async function deletePurchaseOrderAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deletePurchaseOrder(restaurantId, id);
  if (ok) revalidatePath("/fournisseurs");
  return ok;
}
