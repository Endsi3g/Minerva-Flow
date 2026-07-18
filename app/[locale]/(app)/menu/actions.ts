"use server";

import { revalidatePath } from "next/cache";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  recordSale,
  type MenuItemInput,
} from "@/lib/data/menu";
import { createMenuShare, deleteMenuShare } from "@/lib/data/menu-shares";
import { createOffer, updateOffer, deleteOffer, type OfferInput } from "@/lib/data/offers";
import { updateRestaurantAction } from "@/app/[locale]/(app)/settings/actions";
import type { MenuItem, MenuShare, Offer } from "@/lib/types";

export async function createMenuItemAction(
  restaurantId: string,
  input: MenuItemInput
): Promise<MenuItem | null> {
  if (!input.name.trim()) return null;
  const item = await createMenuItem(restaurantId, input);
  if (item) revalidatePath("/menu");
  return item;
}

export async function updateMenuItemAction(
  restaurantId: string,
  id: string,
  patch: Partial<MenuItemInput>
): Promise<MenuItem | null> {
  const item = await updateMenuItem(restaurantId, id, patch);
  if (item) revalidatePath("/menu");
  return item;
}

export async function deleteMenuItemAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteMenuItem(restaurantId, id);
  if (ok) revalidatePath("/menu");
  return ok;
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

export async function createOfferAction(restaurantId: string, input: OfferInput): Promise<Offer | null> {
  if (!input.title.trim()) return null;
  const offer = await createOffer(restaurantId, input);
  if (offer) revalidatePath("/menu");
  return offer;
}

export async function updateOfferAction(
  restaurantId: string,
  offerId: string,
  patch: Partial<OfferInput>
): Promise<Offer | null> {
  const offer = await updateOffer(restaurantId, offerId, patch);
  if (offer) revalidatePath("/menu");
  return offer;
}

export async function deleteOfferAction(restaurantId: string, offerId: string): Promise<boolean> {
  const ok = await deleteOffer(restaurantId, offerId);
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
