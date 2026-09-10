"use server";

import { revalidatePath } from "next/cache";
import {
  createMenuItem,
  createMenuItems,
  updateMenuItem,
  deleteMenuItem,
  recordSale,
  type MenuItemInput,
} from "@/lib/data/menu";
import { createMenuShare, deleteMenuShare } from "@/lib/data/menu-shares";
import { createOffer, updateOffer, deleteOffer, type OfferInput } from "@/lib/data/offers";
import { updateRestaurantAction } from "@/app/[locale]/(app)/settings/actions";
import { getRecipeItems, setRecipeItems } from "@/lib/data/recipes";
import type { MenuItem, MenuShare, Offer, RecipeItem } from "@/lib/types";
import { getPosItemMappings, upsertPosItemMapping, type PosItemMapping } from "@/lib/pos/item-mapping";
import type { PosProvider } from "@/lib/data/pos-connections";
import {
  pushMenuItemToConnectedProviders,
  deleteMenuItemFromConnectedProviders,
  getConnectedCatalogProviders,
  reconcileMenuItemsForProvider,
} from "@/lib/pos/catalog-sync";
import { getMenuItems } from "@/lib/data/menu";

export async function createMenuItemAction(
  restaurantId: string,
  input: MenuItemInput
): Promise<MenuItem | null> {
  if (!input.name.trim()) return null;
  const item = await createMenuItem(restaurantId, input);
  if (item) {
    revalidatePath("/menu");
    await pushMenuItemToConnectedProviders(restaurantId, item).catch(() => {});
  }
  return item;
}

export async function createMenuItemsAction(restaurantId: string, inputs: MenuItemInput[]): Promise<MenuItem[]> {
  const valid = inputs.filter((i) => i.name.trim().length > 0 && Number.isFinite(i.price) && i.price >= 0);
  if (valid.length === 0) return [];
  const items = await createMenuItems(restaurantId, valid);
  if (items.length > 0) {
    revalidatePath("/menu");
    await Promise.all(items.map((item) => pushMenuItemToConnectedProviders(restaurantId, item).catch(() => {})));
  }
  return items;
}

export async function updateMenuItemAction(
  restaurantId: string,
  id: string,
  patch: Partial<MenuItemInput>
): Promise<MenuItem | null> {
  const item = await updateMenuItem(restaurantId, id, patch);
  if (item) {
    revalidatePath("/menu");
    await pushMenuItemToConnectedProviders(restaurantId, item).catch(() => {});
  }
  return item;
}

export async function deleteMenuItemAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteMenuItem(restaurantId, id);
  if (ok) {
    revalidatePath("/menu");
    await deleteMenuItemFromConnectedProviders(restaurantId, id).catch(() => {});
  }
  return ok;
}

/** "Resynchroniser tout" — pushes every menu item to every connected Clover/Square account, then pulls back any remote-side changes. */
export async function resyncMenuToPosAction(restaurantId: string): Promise<{ providers: number; pushed: number; pulled: number }> {
  const providers = await getConnectedCatalogProviders(restaurantId);
  if (providers.length === 0) return { providers: 0, pushed: 0, pulled: 0 };

  const items = await getMenuItems(restaurantId);
  for (const item of items) {
    await pushMenuItemToConnectedProviders(restaurantId, item).catch(() => {});
  }

  let pushed = items.length * providers.length;
  let pulled = 0;
  for (const provider of providers) {
    const result = await reconcileMenuItemsForProvider(restaurantId, provider);
    pulled += result.pulled;
  }
  revalidatePath("/menu");
  return { providers: providers.length, pushed, pulled };
}

export async function recordSaleAction(
  restaurantId: string,
  id: string,
  quantity: number
): Promise<MenuItem | null> {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const item = await recordSale(restaurantId, id, quantity);
  if (item) revalidatePath("/menu");
  return item;
}

export async function createMenuShareAction(
  restaurantId: string,
  input: { title: string; itemIds?: string[] | null }
): Promise<MenuShare | null> {
  if (!input.title.trim()) return null;
  const share = await createMenuShare(restaurantId, input);
  if (share) revalidatePath("/menu");
  return share;
}

export async function deleteMenuShareAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteMenuShare(restaurantId, id);
  if (ok) revalidatePath("/menu");
  return ok;
}

function isValidOfferWindow(startsAt?: string | null, endsAt?: string | null): boolean {
  if (!startsAt || !endsAt) return true;
  return new Date(startsAt).getTime() < new Date(endsAt).getTime();
}

export async function createOfferAction(restaurantId: string, input: OfferInput): Promise<Offer | null> {
  const title = input.title.trim();
  if (!title) return null;
  if (!isValidOfferWindow(input.startsAt, input.endsAt)) return null;
  const offer = await createOffer(restaurantId, { ...input, title });
  if (offer) revalidatePath("/menu");
  return offer;
}

export async function updateOfferAction(
  restaurantId: string,
  offerId: string,
  patch: Partial<OfferInput>
): Promise<Offer | null> {
  if (patch.title !== undefined && !patch.title.trim()) return null;
  if (!isValidOfferWindow(patch.startsAt, patch.endsAt)) return null;
  const normalizedPatch = patch.title !== undefined ? { ...patch, title: patch.title.trim() } : patch;
  const offer = await updateOffer(restaurantId, offerId, normalizedPatch);
  if (offer) revalidatePath("/menu");
  return offer;
}

export async function deleteOfferAction(restaurantId: string, offerId: string): Promise<boolean> {
  const ok = await deleteOffer(restaurantId, offerId);
  if (ok) revalidatePath("/menu");
  return ok;
}

export async function getRecipeItemsAction(restaurantId: string, menuItemId: string): Promise<RecipeItem[]> {
  return getRecipeItems(restaurantId, menuItemId);
}

/**
 * Saves the "recette" (which inventory items this dish consumes, and how
 * much of each per unit sold) from the menu item editor's Recette section.
 * This is what lets applyServedOrderEffects (lib/data/orders.ts) decrement
 * inventory automatically when an order for this dish is served.
 */
export async function updateMenuItemRecipeAction(
  restaurantId: string,
  menuItemId: string,
  items: { inventoryItemId: string; quantityPerUnit: number }[]
): Promise<boolean> {
  const ok = await setRecipeItems(restaurantId, menuItemId, items);
  if (ok) revalidatePath("/menu");
  return ok;
}

export async function updateMenuSettingsAction(
  restaurantId: string,
  input: { taxRate?: number; acceptsTips?: boolean }
): Promise<boolean> {
  const restaurant = await updateRestaurantAction(restaurantId, input);
  if (restaurant) revalidatePath("/menu");
  return Boolean(restaurant);
}

export async function getPosItemMappingsAction(
  restaurantId: string,
  provider?: PosProvider
): Promise<PosItemMapping[]> {
  return getPosItemMappings(restaurantId, provider);
}

export async function upsertPosItemMappingAction(
  restaurantId: string,
  provider: PosProvider,
  externalItemId: string,
  externalItemName: string,
  menuItemId: string | null
): Promise<boolean> {
  const ok = await upsertPosItemMapping(
    restaurantId,
    provider,
    externalItemId,
    externalItemName,
    menuItemId,
    false
  );
  if (ok) revalidatePath("/menu");
  return ok;
}

export async function createMenuItemFromPosAction(
  restaurantId: string,
  provider: PosProvider,
  externalItemId: string,
  externalItemName: string,
  price: number,
  category?: string
): Promise<MenuItem | null> {
  const item = await createMenuItem(restaurantId, {
    name: externalItemName.trim(),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    foodCost: 0,
    category: category?.trim() || "Plats",
    description: `Article importé depuis ${provider.toUpperCase()}`,
  });

  if (item) {
    await upsertPosItemMapping(
      restaurantId,
      provider,
      externalItemId,
      externalItemName,
      item.id,
      false
    );
    revalidatePath("/menu");
  }

  return item;
}

