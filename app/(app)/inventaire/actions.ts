"use server";

import { revalidatePath } from "next/cache";
import {
  createInventoryItem,
  deleteInventoryItem,
  logMovement,
  getInventoryMovements,
  type InventoryItemInput,
} from "@/lib/data/inventory";
import type { InventoryItem, InventoryMovement, InventoryMovementType } from "@/lib/types";

export async function createInventoryItemAction(
  restaurantId: string,
  input: InventoryItemInput
): Promise<InventoryItem | null> {
  if (!input.name.trim()) return null;
  const item = await createInventoryItem(restaurantId, input);
  if (item) revalidatePath("/inventaire");
  return item;
}

export async function deleteInventoryItemAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteInventoryItem(restaurantId, id);
  if (ok) revalidatePath("/inventaire");
  return ok;
}

export async function logMovementAction(
  restaurantId: string,
  itemId: string,
  type: InventoryMovementType,
  quantity: number,
  reason?: string | null
): Promise<InventoryItem | null> {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const item = await logMovement(restaurantId, itemId, type, quantity, reason);
  if (item) {
    revalidatePath("/inventaire");
    revalidatePath("/depenses");
    revalidatePath("/finance");
  }
  return item;
}

export async function getInventoryMovementsAction(itemId: string): Promise<InventoryMovement[]> {
  return getInventoryMovements(itemId);
}
