"use server";

import { revalidatePath } from "next/cache";
import {
  createInventoryItem,
  deleteInventoryItem,
  logMovement,
  getInventoryMovements,
  getInventoryItems,
  type InventoryItemInput,
} from "@/lib/data/inventory";
import type { InventoryItem, InventoryMovement, InventoryMovementType } from "@/lib/types";
import {
  pushInventoryItemToConnectedProviders,
  getConnectedCatalogProviders,
  reconcileInventoryForProvider,
  type CatalogPosProvider,
} from "@/lib/pos/catalog-sync";
import {
  browseCatalogForLinking,
  getPosInventoryMappings,
  upsertPosInventoryMapping,
  type PosInventoryMapping,
} from "@/lib/pos/inventory-mapping";

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
    await pushInventoryItemToConnectedProviders(restaurantId, item).catch(() => {});
  }
  return item;
}

export async function getInventoryMovementsAction(itemId: string): Promise<InventoryMovement[]> {
  return getInventoryMovements(itemId);
}

/** POS catalog items an owner can pick from to link to a Minerva Flow inventory item (see PosInventoryMappingCard). */
export async function browseCatalogForLinkingAction(restaurantId: string, provider: CatalogPosProvider) {
  return browseCatalogForLinking(restaurantId, provider);
}

export async function getPosInventoryMappingsAction(restaurantId: string, provider?: CatalogPosProvider): Promise<PosInventoryMapping[]> {
  return getPosInventoryMappings(restaurantId, provider);
}

export async function upsertPosInventoryMappingAction(
  restaurantId: string,
  provider: CatalogPosProvider,
  externalItemId: string,
  externalItemName: string,
  inventoryItemId: string | null,
  externalVariationId?: string | null
): Promise<boolean> {
  const ok = await upsertPosInventoryMapping(restaurantId, provider, externalItemId, externalItemName, inventoryItemId, externalVariationId);
  if (ok) revalidatePath("/inventaire");
  return ok;
}

/** "Resynchroniser tout" — pushes every linked inventory item's stock to every connected Clover/Square account, then pulls back remote-side counts. */
export async function resyncInventoryToPosAction(restaurantId: string): Promise<{ providers: number; pushed: number; pulled: number }> {
  const providers = await getConnectedCatalogProviders(restaurantId);
  if (providers.length === 0) return { providers: 0, pushed: 0, pulled: 0 };

  const items = await getInventoryItems(restaurantId);
  for (const item of items) {
    await pushInventoryItemToConnectedProviders(restaurantId, item).catch(() => {});
  }

  let pulled = 0;
  for (const provider of providers) {
    const result = await reconcileInventoryForProvider(restaurantId, provider);
    pulled += result.pulled;
  }
  revalidatePath("/inventaire");
  return { providers: providers.length, pushed: items.length * providers.length, pulled };
}
