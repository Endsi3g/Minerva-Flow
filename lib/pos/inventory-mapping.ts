import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidCloverAccessToken, fetchCloverCatalogItems } from "./clover";
import { getValidSquareAccessToken, fetchSquareCatalogItems } from "./square";
import type { CatalogPosProvider } from "./catalog-sync";

export type PosInventoryMapping = {
  id: string;
  restaurantId: string;
  provider: CatalogPosProvider;
  externalItemId: string;
  externalItemName: string;
  inventoryItemId: string | null;
  inventoryItem?: { id: string; name: string; unit: string; quantityOnHand: number } | null;
};

/**
 * Unlike pos_item_mappings (populated by ticket ingestion discovering
 * external items as sales come in), inventory has no equivalent discovery
 * path — stock counts aren't ingested from tickets. So mapping starts by
 * browsing the POS's live catalog directly (see PosInventoryMappingCard),
 * not from a pre-populated list.
 */
export async function browseCatalogForLinking(
  restaurantId: string,
  provider: CatalogPosProvider
): Promise<{ externalId: string; externalVariationId: string | null; name: string }[]> {
  if (provider === "clover") {
    const tokenInfo = await getValidCloverAccessToken(restaurantId);
    if (!tokenInfo?.merchantId) return [];
    const items = await fetchCloverCatalogItems(tokenInfo.accessToken, tokenInfo.merchantId);
    return items.map((i) => ({ externalId: i.externalId, externalVariationId: null, name: i.name }));
  }
  const accessToken = await getValidSquareAccessToken(restaurantId);
  if (!accessToken) return [];
  const items = await fetchSquareCatalogItems(accessToken);
  return items.map((i) => ({ externalId: i.externalId, externalVariationId: i.variationId, name: i.name }));
}

export async function getPosInventoryMappings(restaurantId: string, provider?: CatalogPosProvider): Promise<PosInventoryMapping[]> {
  const supabase = await createClient();
  let query = supabase
    .from("pos_inventory_mappings")
    .select(
      `id, restaurant_id, provider, external_item_id, external_item_name, inventory_item_id,
       inventory_items ( id, name, unit, quantity_on_hand )`
    )
    .eq("restaurant_id", restaurantId);
  if (provider) query = query.eq("provider", provider);

  const { data, error } = await query.order("external_item_name", { ascending: true });
  if (error || !data) return [];

  return (data as any[]).map((row) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    provider: row.provider,
    externalItemId: row.external_item_id,
    externalItemName: row.external_item_name,
    inventoryItemId: row.inventory_item_id,
    inventoryItem: row.inventory_items
      ? {
          id: row.inventory_items.id,
          name: row.inventory_items.name,
          unit: row.inventory_items.unit,
          quantityOnHand: row.inventory_items.quantity_on_hand,
        }
      : null,
  }));
}

/** Links (or unlinks, with inventoryItemId=null) a POS catalog item to a Minerva Flow inventory item — creates the mapping row if none exists yet for that external item. */
export async function upsertPosInventoryMapping(
  restaurantId: string,
  provider: CatalogPosProvider,
  externalItemId: string,
  externalItemName: string,
  inventoryItemId: string | null,
  externalVariationId?: string | null
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("pos_inventory_mappings").upsert(
    {
      restaurant_id: restaurantId,
      provider,
      external_item_id: externalItemId,
      external_item_name: externalItemName,
      inventory_item_id: inventoryItemId,
      external_variation_id: externalVariationId ?? null,
    },
    { onConflict: "restaurant_id,provider,external_item_id" }
  );
  return !error;
}
