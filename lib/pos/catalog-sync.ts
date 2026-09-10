import { createAdminClient } from "@/lib/supabase/admin";
import { getPosConnections } from "@/lib/data/pos-connections";
import {
  getValidCloverAccessToken,
  upsertCloverCatalogItem,
  deleteCloverCatalogItem,
  updateCloverItemStock,
  fetchCloverCatalogItems,
} from "./clover";
import {
  getValidSquareAccessToken,
  upsertSquareCatalogItem,
  deleteSquareCatalogObject,
  updateSquareInventoryCount,
  fetchSquareCatalogItems,
  fetchSquareInventoryCounts,
  getSquareDefaultLocationId,
} from "./square";
import type { MenuItem, InventoryItem } from "@/lib/types";

export type CatalogPosProvider = "clover" | "square";

/** Restaurant's actively-connected Clover/Square connections — the providers menu/inventory push targets. */
export async function getConnectedCatalogProviders(restaurantId: string): Promise<CatalogPosProvider[]> {
  const connections = await getPosConnections(restaurantId);
  return connections
    .filter((c) => (c.provider === "clover" || c.provider === "square") && c.status === "connecte")
    .map((c) => c.provider as CatalogPosProvider);
}

type MenuMappingRow = {
  id: string;
  external_item_id: string;
  external_variation_id: string | null;
  external_updated_at: string | null;
  local_synced_at: string | null;
};

async function findMenuMapping(
  admin: ReturnType<typeof createAdminClient>,
  restaurantId: string,
  provider: CatalogPosProvider,
  menuItemId: string
): Promise<MenuMappingRow | null> {
  const { data } = await admin
    .from("pos_item_mappings")
    .select("id, external_item_id, external_variation_id, external_updated_at, local_synced_at")
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider)
    .eq("menu_item_id", menuItemId)
    .maybeSingle();
  return data as MenuMappingRow | null;
}

/**
 * Pushes one menu item's name/price/active state to one connected provider,
 * creating the mapping on first push. Best-effort: a POS-side failure (bad
 * token, network) returns false but never throws, so a menu edit in Minerva
 * Flow itself always succeeds regardless of POS reachability.
 */
export async function pushMenuItemToProvider(
  restaurantId: string,
  provider: CatalogPosProvider,
  menuItem: MenuItem
): Promise<boolean> {
  const admin = createAdminClient();
  const existing = await findMenuMapping(admin, restaurantId, provider, menuItem.id);

  try {
    if (provider === "clover") {
      const tokenInfo = await getValidCloverAccessToken(restaurantId);
      if (!tokenInfo?.merchantId) return false;
      const externalId = await upsertCloverCatalogItem(tokenInfo.accessToken, tokenInfo.merchantId, {
        externalId: existing?.external_item_id ?? null,
        name: menuItem.name,
        price: menuItem.price,
        active: menuItem.active,
      });
      if (!externalId) return false;

      await admin.from("pos_item_mappings").upsert(
        {
          restaurant_id: restaurantId,
          provider,
          external_item_id: externalId,
          external_item_name: menuItem.name,
          menu_item_id: menuItem.id,
          local_synced_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id,provider,external_item_id" }
      );
      return true;
    }

    // square
    const accessToken = await getValidSquareAccessToken(restaurantId);
    if (!accessToken) return false;
    const result = await upsertSquareCatalogItem(accessToken, {
      externalId: existing?.external_item_id ?? null,
      variationId: existing?.external_variation_id ?? null,
      name: menuItem.name,
      price: menuItem.price,
      active: menuItem.active,
    });
    if (!result) return false;

    await admin.from("pos_item_mappings").upsert(
      {
        restaurant_id: restaurantId,
        provider,
        external_item_id: result.itemId,
        external_variation_id: result.variationId,
        external_item_name: menuItem.name,
        menu_item_id: menuItem.id,
        local_synced_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id,provider,external_item_id" }
    );
    return true;
  } catch (err) {
    console.error(`pushMenuItemToProvider(${provider}) failed:`, err);
    return false;
  }
}

/** Pushes a menu item to every connected Clover/Square account for the restaurant. */
export async function pushMenuItemToConnectedProviders(restaurantId: string, menuItem: MenuItem): Promise<void> {
  const providers = await getConnectedCatalogProviders(restaurantId);
  await Promise.all(providers.map((provider) => pushMenuItemToProvider(restaurantId, provider, menuItem)));
}

/** Deletes a menu item's linked catalog object on every connected provider, then clears the mapping's link. */
export async function deleteMenuItemFromConnectedProviders(restaurantId: string, menuItemId: string): Promise<void> {
  const admin = createAdminClient();
  const providers = await getConnectedCatalogProviders(restaurantId);

  await Promise.all(
    providers.map(async (provider) => {
      const mapping = await findMenuMapping(admin, restaurantId, provider, menuItemId);
      if (!mapping) return;
      try {
        if (provider === "clover") {
          const tokenInfo = await getValidCloverAccessToken(restaurantId);
          if (tokenInfo?.merchantId) await deleteCloverCatalogItem(tokenInfo.accessToken, tokenInfo.merchantId, mapping.external_item_id);
        } else {
          const accessToken = await getValidSquareAccessToken(restaurantId);
          if (accessToken) await deleteSquareCatalogObject(accessToken, mapping.external_item_id);
        }
      } catch (err) {
        console.error(`deleteMenuItemFromConnectedProviders(${provider}) failed:`, err);
      }
      await admin.from("pos_item_mappings").update({ menu_item_id: null }).eq("id", mapping.id);
    })
  );
}

type InventoryMappingRow = {
  id: string;
  external_item_id: string;
  external_variation_id: string | null;
  inventory_item_id: string | null;
};

async function findInventoryMappingByItem(
  admin: ReturnType<typeof createAdminClient>,
  restaurantId: string,
  provider: CatalogPosProvider,
  inventoryItemId: string
): Promise<InventoryMappingRow | null> {
  const { data } = await admin
    .from("pos_inventory_mappings")
    .select("id, external_item_id, external_variation_id, inventory_item_id")
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider)
    .eq("inventory_item_id", inventoryItemId)
    .maybeSingle();
  return data as InventoryMappingRow | null;
}

/**
 * Pushes one inventory item's stock quantity to a provider — only for items
 * already linked via pos_inventory_mappings (see PosInventoryMappingCard;
 * unlike menu items, there is no "create the catalog item" case here since
 * stock is tracked against a catalog item that must already exist on the
 * POS side).
 */
export async function pushInventoryItemToProvider(
  restaurantId: string,
  provider: CatalogPosProvider,
  inventoryItem: InventoryItem
): Promise<boolean> {
  const admin = createAdminClient();
  const mapping = await findInventoryMappingByItem(admin, restaurantId, provider, inventoryItem.id);
  if (!mapping) return false;

  try {
    let ok = false;
    if (provider === "clover") {
      const tokenInfo = await getValidCloverAccessToken(restaurantId);
      if (!tokenInfo?.merchantId) return false;
      ok = await updateCloverItemStock(tokenInfo.accessToken, tokenInfo.merchantId, mapping.external_item_id, inventoryItem.quantityOnHand);
    } else {
      const accessToken = await getValidSquareAccessToken(restaurantId);
      if (!accessToken || !mapping.external_variation_id) return false;
      const locationId = await getSquareDefaultLocationId(accessToken);
      if (!locationId) return false;
      ok = await updateSquareInventoryCount(accessToken, mapping.external_variation_id, locationId, inventoryItem.quantityOnHand);
    }
    if (ok) {
      await admin.from("pos_inventory_mappings").update({ local_synced_at: new Date().toISOString() }).eq("id", mapping.id);
    }
    return ok;
  } catch (err) {
    console.error(`pushInventoryItemToProvider(${provider}) failed:`, err);
    return false;
  }
}

export async function pushInventoryItemToConnectedProviders(restaurantId: string, inventoryItem: InventoryItem): Promise<void> {
  const providers = await getConnectedCatalogProviders(restaurantId);
  await Promise.all(providers.map((provider) => pushInventoryItemToProvider(restaurantId, provider, inventoryItem)));
}

export type ReconcileResult = { pushed: number; pulled: number };

/**
 * Bidirectional reconciliation for one restaurant+provider's linked menu
 * items — the pull half of "push seul n'est pas suffisant" (bidirectional
 * was the explicit choice). Last-write-wins: whichever side's timestamp is
 * newer since the last successful sync decides the direction, per mapping.
 * Runs on a 15-minute cron (see /api/cron/pos-catalog-reconcile) rather than
 * webhooks — simpler to ship and validate in sandbox first; can be replaced
 * with Clover/Square webhooks later if 15 minutes is too slow for the user.
 */
export async function reconcileMenuItemsForProvider(restaurantId: string, provider: CatalogPosProvider): Promise<ReconcileResult> {
  const admin = createAdminClient();
  let pushed = 0;
  let pulled = 0;

  const { data: mappings } = await admin
    .from("pos_item_mappings")
    .select("id, external_item_id, external_variation_id, external_updated_at, local_synced_at, menu_item_id")
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider)
    .not("menu_item_id", "is", null);
  const linkedMappings = (mappings ?? []) as (MenuMappingRow & { menu_item_id: string })[];
  if (linkedMappings.length === 0) return { pushed, pulled };

  const remoteItems =
    provider === "clover"
      ? await (async () => {
          const tokenInfo = await getValidCloverAccessToken(restaurantId);
          if (!tokenInfo?.merchantId) return [];
          return fetchCloverCatalogItems(tokenInfo.accessToken, tokenInfo.merchantId);
        })()
      : await (async () => {
          const accessToken = await getValidSquareAccessToken(restaurantId);
          if (!accessToken) return [];
          return fetchSquareCatalogItems(accessToken);
        })();

  const remoteById = new Map(remoteItems.map((r) => [r.externalId, r]));

  const { data: menuItemRows } = await admin
    .from("menu_items")
    .select("id, name, price, food_cost, units_sold, active, description, image_url, image_urls, video_url, category, restaurant_id, created_at, updated_at")
    .eq("restaurant_id", restaurantId)
    .in("id", linkedMappings.map((m) => m.menu_item_id));
  const menuItemById = new Map((menuItemRows ?? []).map((r) => [r.id as string, r]));

  for (const mapping of linkedMappings) {
    const remote = remoteById.get(mapping.external_item_id);
    const local = menuItemById.get(mapping.menu_item_id);
    if (!remote || !local) continue;

    const remoteUpdatedAt = "modifiedTime" in remote ? remote.modifiedTime : remote.updatedAt;
    const localUpdatedAt = new Date(local.updated_at as string).getTime();
    const lastSyncedAt = mapping.local_synced_at ? new Date(mapping.local_synced_at).getTime() : 0;
    const remoteChangedSinceSync = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() > lastSyncedAt : false;
    const localChangedSinceSync = localUpdatedAt > lastSyncedAt;

    if (remoteChangedSinceSync && !localChangedSinceSync) {
      // Remote is newer and local hasn't moved — pull remote's price/name in.
      if (remote.name !== local.name || Math.abs(remote.price - Number(local.price)) > 0.001) {
        await admin
          .from("menu_items")
          .update({ name: remote.name, price: remote.price })
          .eq("id", mapping.menu_item_id);
        pulled++;
      }
      await admin
        .from("pos_item_mappings")
        .update({ external_updated_at: remoteUpdatedAt, local_synced_at: new Date().toISOString() })
        .eq("id", mapping.id);
    } else if (localChangedSinceSync) {
      // Local changed (or both changed — local wins ties, since the owner's
      // last edit in Minerva Flow is the more deliberate action of the two).
      const ok = await pushMenuItemToProvider(restaurantId, provider, {
        id: local.id,
        restaurantId: local.restaurant_id,
        name: local.name,
        category: local.category,
        price: Number(local.price),
        foodCost: Number(local.food_cost),
        unitsSold: Number(local.units_sold),
        active: local.active,
        description: local.description,
        imageUrl: local.image_url,
        imageUrls: local.image_urls ?? [],
        videoUrl: local.video_url,
        createdAt: local.created_at,
        updatedAt: local.updated_at,
      });
      if (ok) pushed++;
    }
  }

  return { pushed, pulled };
}

/**
 * Bidirectional reconciliation for linked inventory quantities — same
 * last-write-wins policy as reconcileMenuItemsForProvider.
 */
export async function reconcileInventoryForProvider(restaurantId: string, provider: CatalogPosProvider): Promise<ReconcileResult> {
  const admin = createAdminClient();
  let pushed = 0;
  let pulled = 0;

  const { data: mappings } = await admin
    .from("pos_inventory_mappings")
    .select("id, external_item_id, external_variation_id, external_updated_at, local_synced_at, inventory_item_id")
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider)
    .not("inventory_item_id", "is", null);
  const linkedMappings = (mappings ?? []) as (InventoryMappingRow & {
    external_updated_at: string | null;
    local_synced_at: string | null;
  })[];
  if (linkedMappings.length === 0) return { pushed, pulled };

  const { data: itemRows } = await admin
    .from("inventory_items")
    .select("id, quantity_on_hand, updated_at")
    .eq("restaurant_id", restaurantId)
    .in("id", linkedMappings.map((m) => m.inventory_item_id).filter((id): id is string => Boolean(id)));
  const itemById = new Map((itemRows ?? []).map((r) => [r.id as string, r]));

  let remoteQuantities = new Map<string, { quantity: number | null; updatedAt: string | null }>();
  if (provider === "clover") {
    const tokenInfo = await getValidCloverAccessToken(restaurantId);
    if (tokenInfo?.merchantId) {
      const items = await fetchCloverCatalogItems(tokenInfo.accessToken, tokenInfo.merchantId);
      remoteQuantities = new Map(items.map((i) => [i.externalId, { quantity: i.quantity, updatedAt: i.modifiedTime }]));
    }
  } else {
    const accessToken = await getValidSquareAccessToken(restaurantId);
    if (accessToken) {
      const locationId = await getSquareDefaultLocationId(accessToken);
      const variationIds = linkedMappings.map((m) => m.external_variation_id).filter((id): id is string => Boolean(id));
      if (locationId && variationIds.length > 0) {
        const counts = await fetchSquareInventoryCounts(accessToken, variationIds, locationId);
        for (const m of linkedMappings) {
          if (m.external_variation_id && counts.has(m.external_variation_id)) {
            remoteQuantities.set(m.external_item_id, { quantity: counts.get(m.external_variation_id) ?? null, updatedAt: null });
          }
        }
      }
    }
  }

  for (const mapping of linkedMappings) {
    if (!mapping.inventory_item_id) continue;
    const local = itemById.get(mapping.inventory_item_id);
    const remote = remoteQuantities.get(mapping.external_item_id);
    if (!local || !remote || remote.quantity === null) continue;

    const localUpdatedAt = new Date(local.updated_at as string).getTime();
    const lastSyncedAt = mapping.local_synced_at ? new Date(mapping.local_synced_at).getTime() : 0;
    const localChangedSinceSync = localUpdatedAt > lastSyncedAt;
    const remoteChangedSinceSync = remote.updatedAt ? new Date(remote.updatedAt).getTime() > lastSyncedAt : remote.quantity !== Number(local.quantity_on_hand);

    if (localChangedSinceSync) {
      const inventoryItem: InventoryItem = {
        id: local.id,
        restaurantId,
        name: "",
        category: null,
        unit: "",
        quantityOnHand: Number(local.quantity_on_hand),
        parLevel: null,
        unitCost: 0,
        supplierId: null,
        createdAt: "",
        updatedAt: local.updated_at as string,
      };
      const ok = await pushInventoryItemToProvider(restaurantId, provider, inventoryItem);
      if (ok) pushed++;
    } else if (remoteChangedSinceSync && remote.quantity !== Number(local.quantity_on_hand)) {
      await admin.from("inventory_items").update({ quantity_on_hand: remote.quantity }).eq("id", mapping.inventory_item_id);
      await admin
        .from("pos_inventory_mappings")
        .update({ external_updated_at: remote.updatedAt ?? new Date().toISOString(), local_synced_at: new Date().toISOString() })
        .eq("id", mapping.id);
      pulled++;
    }
  }

  return { pushed, pulled };
}
