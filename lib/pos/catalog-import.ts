import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeItemName } from "@/lib/pos/item-mapping";
import { fetchCloverCatalogItems, getValidCloverAccessToken } from "@/lib/pos/clover";

export type CloverCatalogImportResult =
  | { ok: true; createdDrafts: number; linkedExisting: number; alreadyMapped: number }
  | { ok: false; reason: "not_connected" | "empty_catalog" | "read_failed" };

/**
 * Copies Clover catalog entries into Minerva Flow as inactive drafts.
 * Exact, unambiguous name matches are linked to an existing menu item; new
 * entries remain unpublished until an owner reviews and activates them.
 */
export async function importCloverCatalogAsDrafts(
  restaurantId: string
): Promise<CloverCatalogImportResult> {
  const tokens = await getValidCloverAccessToken(restaurantId);
  if (!tokens?.merchantId) return { ok: false, reason: "not_connected" };

  const catalog = await fetchCloverCatalogItems(tokens.accessToken, tokens.merchantId);
  if (catalog.length === 0) return { ok: false, reason: "empty_catalog" };

  const admin = createAdminClient();
  const [{ data: mappings, error: mappingsError }, { data: menuRows, error: menuError }] = await Promise.all([
    admin
      .from("pos_item_mappings")
      .select("id, external_item_id, menu_item_id")
      .eq("restaurant_id", restaurantId)
      .eq("provider", "clover"),
    admin
      .from("menu_items")
      .select("id, name, price, active, is_draft")
      .eq("restaurant_id", restaurantId),
  ]);
  if (mappingsError || menuError) return { ok: false, reason: "read_failed" };

  const mappingByExternalId = new Map((mappings ?? []).map((row) => [row.external_item_id as string, row]));
  const mappedMenuIds = new Set(
    (mappings ?? []).map((row) => row.menu_item_id as string | null).filter((id): id is string => Boolean(id))
  );
  const normalizedMenu = new Map<string, Array<{ id: string; price: number; active: boolean; is_draft: boolean }>>();
  for (const row of menuRows ?? []) {
    const key = normalizeItemName(row.name as string);
    const matches = normalizedMenu.get(key) ?? [];
    matches.push({
      id: row.id as string,
      price: Number(row.price),
      active: Boolean(row.active),
      is_draft: Boolean(row.is_draft),
    });
    normalizedMenu.set(key, matches);
  }

  let createdDrafts = 0;
  let linkedExisting = 0;
  let alreadyMapped = 0;

  for (const item of catalog) {
    const priorMapping = mappingByExternalId.get(item.externalId);
    if (priorMapping?.menu_item_id) {
      alreadyMapped++;
      continue;
    }

    const candidates = (normalizedMenu.get(normalizeItemName(item.name)) ?? [])
      .filter((candidate) => !mappedMenuIds.has(candidate.id));
    const exactMatch = candidates.length === 1 ? candidates[0] : null;
    let menuItemId = exactMatch?.id ?? null;
    let createdDraftId: string | null = null;

    if (exactMatch?.is_draft) {
      const { error } = await admin
        .from("menu_items")
        .update({ price: item.price, updated_at: new Date().toISOString() })
        .eq("id", exactMatch.id)
        .eq("restaurant_id", restaurantId)
        .eq("is_draft", true)
        .eq("active", false);
      if (error) return { ok: false, reason: "read_failed" };
    }

    if (!menuItemId) {
      const { data: draft, error } = await admin
        .from("menu_items")
        .insert({
          restaurant_id: restaurantId,
          name: item.name,
          category: "À classer — Clover",
          price: item.price,
          food_cost: 0,
          active: false,
          is_draft: true,
          allergens_confirmed: false,
          description: "Importé du catalogue Clover. Brouillon inactif : vérifier le prix, les variantes, le conditionnement et les allergènes avant activation.",
        })
        .select("id")
        .single();
      if (error || !draft) return { ok: false, reason: "read_failed" };
      menuItemId = draft.id as string;
      createdDraftId = menuItemId;
    }

    const mappingPayload = {
      restaurant_id: restaurantId,
      provider: "clover" as const,
      external_item_id: item.externalId,
      external_item_name: item.name,
      menu_item_id: menuItemId,
      auto_matched: Boolean(exactMatch),
      external_updated_at: item.modifiedTime,
      local_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mappingWrite = priorMapping
      ? await admin.from("pos_item_mappings").update(mappingPayload).eq("id", priorMapping.id)
      : await admin.from("pos_item_mappings").insert(mappingPayload);

    if (mappingWrite.error) {
      if (createdDraftId) {
        await admin
          .from("menu_items")
          .delete()
          .eq("id", createdDraftId)
          .eq("restaurant_id", restaurantId)
          .eq("is_draft", true)
          .eq("active", false);
      }
      return { ok: false, reason: "read_failed" };
    }

    mappedMenuIds.add(menuItemId);
    if (createdDraftId) createdDrafts++;
    else linkedExisting++;
  }

  return { ok: true, createdDrafts, linkedExisting, alreadyMapped };
}
