import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PosProvider } from "@/lib/data/pos-connections";

export type PosItemMapping = {
  id: string;
  restaurantId: string;
  provider: PosProvider;
  externalItemId: string;
  externalItemName: string;
  menuItemId: string | null;
  autoMatched: boolean;
  createdAt: string;
  updatedAt: string;
  menuItem?: {
    id: string;
    name: string;
    price: number;
    category?: string | null;
  } | null;
};

/**
 * Normalizes item names for resilient auto-matching (lowercased, accents stripped,
 * punctuation removed, whitespace collapsed).
 */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Retrieves all POS item mappings for a restaurant, optionally filtered by provider.
 */
export async function getPosItemMappings(
  restaurantId: string,
  provider?: PosProvider
): Promise<PosItemMapping[]> {
  const supabase = await createClient();
  let query = supabase
    .from("pos_item_mappings")
    .select(`
      id,
      restaurant_id,
      provider,
      external_item_id,
      external_item_name,
      menu_item_id,
      auto_matched,
      created_at,
      updated_at,
      menu_items (
        id,
        name,
        price,
        category
      )
    `)
    .eq("restaurant_id", restaurantId);

  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data, error } = await query.order("external_item_name", { ascending: true });

  if (error || !data) return [];

  return (data as any[]).map((row) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    provider: row.provider,
    externalItemId: row.external_item_id,
    externalItemName: row.external_item_name,
    menuItemId: row.menu_item_id,
    autoMatched: row.auto_matched,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    menuItem: row.menu_items
      ? {
          id: row.menu_items.id,
          name: row.menu_items.name,
          price: row.menu_items.price,
          category: row.menu_items.category,
        }
      : null,
  }));
}

/**
 * Updates or creates an item mapping.
 */
export async function upsertPosItemMapping(
  restaurantId: string,
  provider: PosProvider,
  externalItemId: string,
  externalItemName: string,
  menuItemId: string | null,
  autoMatched = false
): Promise<boolean> {
  const admin = createAdminClient();

  const { error } = await admin.from("pos_item_mappings").upsert(
    {
      restaurant_id: restaurantId,
      provider,
      external_item_id: externalItemId,
      external_item_name: externalItemName,
      menu_item_id: menuItemId,
      auto_matched: autoMatched,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "restaurant_id,provider,external_item_id" }
  );

  return !error;
}

/**
 * Resolves an incoming POS item to an existing menu_item_id.
 * 1. Checks if an explicit mapping exists in pos_item_mappings.
 * 2. If not, performs an intelligent name match against available menu items.
 * 3. Records the mapping (linked or unlinked) for transparency and manual curation.
 */
export async function resolvePosItemMapping(
  restaurantId: string,
  provider: PosProvider,
  externalItemId: string,
  externalItemName: string,
  cachedMenuItems?: { id: string; name: string }[]
): Promise<string | null> {
  const admin = createAdminClient();

  // 1. Check existing mapping
  const { data: existing } = await admin
    .from("pos_item_mappings")
    .select("menu_item_id")
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider)
    .eq("external_item_id", externalItemId)
    .maybeSingle();

  if (existing) {
    return existing.menu_item_id;
  }

  // 2. Fetch menu items if not passed in
  let menuItems = cachedMenuItems;
  if (!menuItems) {
    const { data } = await admin
      .from("menu_items")
      .select("id, name")
      .eq("restaurant_id", restaurantId);
    menuItems = (data ?? []) as { id: string; name: string }[];
  }

  // 3. Attempt intelligent normalized matching
  const normalizedPosName = normalizeItemName(externalItemName);
  let matchedMenuItemId: string | null = null;
  let autoMatched = false;

  for (const item of menuItems) {
    if (normalizeItemName(item.name) === normalizedPosName) {
      matchedMenuItemId = item.id;
      autoMatched = true;
      break;
    }
  }

  // 4. Save new mapping
  await admin.from("pos_item_mappings").insert({
    restaurant_id: restaurantId,
    provider,
    external_item_id: externalItemId,
    external_item_name: externalItemName,
    menu_item_id: matchedMenuItemId,
    auto_matched: autoMatched,
  });

  return matchedMenuItemId;
}

/**
 * Returns the count of unmapped POS items for a restaurant.
 */
export async function getUnmappedPosItemsCount(restaurantId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("pos_item_mappings")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .is("menu_item_id", null);

  if (error || count === null) return 0;
  return count;
}
