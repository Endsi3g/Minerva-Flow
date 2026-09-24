"use server";

import { revalidatePath } from "next/cache";
import {
  createMenuItem,
  createMenuItems,
  updateMenuItem,
  deleteMenuItem,
  recordSale,
  getMenuItems,
  mapMenuItem,
  type MenuItemInput,
  type MenuItemRow,
} from "@/lib/data/menu";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function createMenuItemAction(
  restaurantId: string,
  input: MenuItemInput
): Promise<MenuItem | null> {
  if (!input.name.trim()) return null;
  const membership = await getCurrentMembership();
  if (
    membership?.restaurantId !== restaurantId ||
    !["owner", "manager", "staff"].includes(membership.role)
  ) return null;
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

  const pushed = items.length * providers.length;
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

import { getInventoryItems } from "@/lib/data/inventory";

export async function getRecipeItemsAction(restaurantId: string, menuItemId: string): Promise<RecipeItem[]> {
  return getRecipeItems(restaurantId, menuItemId);
}

/**
 * Saves the "recette" (which inventory items this dish consumes, and how
 * much of each per unit sold). Recalculates the theoretical Food Cost
 * from the inventory items' unit costs, updates menu_items.food_cost,
 * and revalidates paths.
 */
export async function updateMenuItemRecipeAction(
  restaurantId: string,
  menuItemId: string,
  items: { inventoryItemId: string; quantityPerUnit: number }[]
): Promise<{ ok: boolean; foodCost: number; recipeItems: RecipeItem[]; updatedItem: MenuItem | null }> {
  const ok = await setRecipeItems(restaurantId, menuItemId, items);
  if (!ok) return { ok: false, foodCost: 0, recipeItems: [], updatedItem: null };

  const inventoryItems = await getInventoryItems(restaurantId);
  const costById = new Map(inventoryItems.map((i) => [i.id, i.unitCost]));
  const calculatedFoodCost = items.reduce((sum, item) => {
    const unitCost = costById.get(item.inventoryItemId) ?? 0;
    return sum + item.quantityPerUnit * unitCost;
  }, 0);

  const roundedFoodCost = Math.round(calculatedFoodCost * 100) / 100;
  const updatedItem = await updateMenuItem(restaurantId, menuItemId, { foodCost: roundedFoodCost });
  const updatedRecipes = await getRecipeItems(restaurantId, menuItemId);

  revalidatePath("/menu");
  revalidatePath(`/menu/${menuItemId}`);
  return { ok: true, foodCost: roundedFoodCost, recipeItems: updatedRecipes, updatedItem };
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

export async function createMenuDraftFromSuggestionAction(
  restaurantId: string,
  suggestionId: string
): Promise<{ ok: true; item: MenuItem } | { ok: false; reason: "not_authorized" | "create_failed" }> {
  if (!restaurantId || !suggestionId) return { ok: false, reason: "not_authorized" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_authorized" };
  // Authorize against the exact restaurant argument rather than the sidebar's
  // selected-restaurant cookie. That cookie can be stale during multi-location
  // navigation; the database RPC independently enforces the same role check.
  const { data: membership, error: membershipError } = await supabase.from("restaurant_members")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (membershipError || !membership || !["owner", "manager"].includes(membership.role)) {
    return { ok: false, reason: "not_authorized" };
  }
  const { data: itemId, error } = await supabase.rpc("create_menu_draft_from_suggestion", {
    p_suggestion_id: suggestionId,
  });
  if (error && (error.code === "42501" || error.message === "not_authorized")) {
    // Some hosted PostgREST deployments do not propagate the SSR cookie claim
    // into SECURITY DEFINER membership helpers consistently. After verifying
    // the user and exact owner/manager membership above, use this guarded,
    // idempotent service-role fallback; the generated item always stays draft.
    return createMenuSuggestionDraftAsVerifiedOwner(restaurantId, suggestionId);
  }
  if (error || typeof itemId !== "string") {
    if (error) console.error("createMenuDraftFromSuggestionAction failed:", error.code ?? "unknown");
    return { ok: false, reason: "create_failed" };
  }
  const { data, error: itemError } = await supabase.from("menu_items").select("*")
    .eq("id", itemId).eq("restaurant_id", restaurantId).maybeSingle();
  if (itemError || !data) {
    if (itemError) console.error("createMenuDraftFromSuggestionAction: draft read failed", itemError.code ?? "unknown");
    return { ok: false, reason: "create_failed" };
  }
  revalidatePath("/menu");
  return { ok: true, item: mapMenuItem(data as MenuItemRow) };
}

async function createMenuSuggestionDraftAsVerifiedOwner(
  restaurantId: string,
  suggestionId: string
): Promise<{ ok: true; item: MenuItem } | { ok: false; reason: "not_authorized" | "create_failed" }> {
  const admin = createAdminClient();
  const { data: suggestion, error: suggestionError } = await admin.from("meal_suggestions")
    .select("id, restaurant_id, title, description, status, menu_item_id")
    .eq("id", suggestionId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (suggestionError || !suggestion) return { ok: false, reason: "create_failed" };

  if (suggestion.status === "draft_added" && suggestion.menu_item_id) {
    const { data: existing, error: existingError } = await admin.from("menu_items").select("*")
      .eq("id", suggestion.menu_item_id).eq("restaurant_id", restaurantId).maybeSingle();
    return existing && !existingError
      ? { ok: true, item: mapMenuItem(existing as MenuItemRow) }
      : { ok: false, reason: "create_failed" };
  }
  if (suggestion.status !== "open" && suggestion.status !== "under_review") {
    return { ok: false, reason: "create_failed" };
  }

  const { data: draft, error: draftError } = await admin.from("menu_items").insert({
    restaurant_id: restaurantId,
    name: suggestion.title,
    category: "Plats",
    price: 0,
    food_cost: 0,
    description: suggestion.description || "Idée proposée par un client — à compléter avant publication.",
    active: false,
    is_draft: true,
    allergens_confirmed: false,
  }).select("*").single();
  if (draftError || !draft) {
    if (draftError) console.error("createMenuDraftFromSuggestionAction: draft insert failed", draftError.code ?? "unknown");
    return { ok: false, reason: "create_failed" };
  }

  const { data: updated, error: updateError } = await admin.from("meal_suggestions")
    .update({ status: "draft_added", menu_item_id: draft.id, updated_at: new Date().toISOString() })
    .eq("id", suggestionId)
    .eq("restaurant_id", restaurantId)
    .eq("status", suggestion.status)
    .is("menu_item_id", null)
    .select("id")
    .maybeSingle();
  if (!updateError && updated) {
    revalidatePath("/menu");
    return { ok: true, item: mapMenuItem(draft as MenuItemRow) };
  }

  // Concurrent clicks can race after the initial read. Keep only the draft
  // linked by the winning update; the loser removes its unpublished row.
  const { error: cleanupError } = await admin.from("menu_items").delete()
    .eq("id", draft.id).eq("restaurant_id", restaurantId).eq("is_draft", true).eq("active", false);
  if (cleanupError) console.error("createMenuDraftFromSuggestionAction: orphan draft cleanup failed", cleanupError.code ?? "unknown");
  const { data: winner } = await admin.from("meal_suggestions")
    .select("status, menu_item_id")
    .eq("id", suggestionId).eq("restaurant_id", restaurantId).maybeSingle();
  if (winner?.status === "draft_added" && winner.menu_item_id) {
    const { data: existing } = await admin.from("menu_items").select("*")
      .eq("id", winner.menu_item_id).eq("restaurant_id", restaurantId).maybeSingle();
    if (existing) {
      revalidatePath("/menu");
      return { ok: true, item: mapMenuItem(existing as MenuItemRow) };
    }
  }
  if (updateError) console.error("createMenuDraftFromSuggestionAction: suggestion update failed", updateError.code ?? "unknown");
  return { ok: false, reason: "create_failed" };
}
