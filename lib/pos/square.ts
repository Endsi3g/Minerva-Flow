import { squareBaseUrl } from "./config";
import { localDayRangeUtc } from "./shared";
import {
  getPosTokens,
  savePosConnectionTokens,
  updatePosConnectionStatus,
} from "@/lib/data/pos-connections";

const SQUARE_VERSION = "2025-01-23";

export type SquareTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  merchantId?: string;
};

export async function refreshSquareTokens(refreshToken: string): Promise<SquareTokens | null> {
  const res = await fetch(`${squareBaseUrl()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID,
      client_secret: process.env.SQUARE_APPLICATION_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: string;
    merchant_id?: string;
  };
  if (!data.access_token) return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    merchantId: data.merchant_id,
  };
}

/**
 * Returns a usable Square access token for a restaurant, refreshing it
 * first if it expires within 24h. Marks the connection "erreur" if the
 * refresh itself fails (revoked access, bad refresh token, etc.).
 */
export async function getValidSquareAccessToken(restaurantId: string): Promise<string | null> {
  const tokens = await getPosTokens(restaurantId, "square");
  if (!tokens) return null;

  const expiresAt = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : 0;
  const needsRefresh = !expiresAt || expiresAt - Date.now() < 24 * 60 * 60 * 1000;
  if (!needsRefresh) return tokens.accessToken;
  if (!tokens.refreshToken) return tokens.accessToken;

  const refreshed = await refreshSquareTokens(tokens.refreshToken);
  if (!refreshed) {
    await updatePosConnectionStatus(restaurantId, "square", "erreur");
    return null;
  }

  await savePosConnectionTokens(restaurantId, "square", {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
    expiresAt: refreshed.expiresAt,
    externalAccountId: refreshed.merchantId,
  });

  return refreshed.accessToken;
}

async function listSquareLocationIds(accessToken: string): Promise<string[]> {
  const res = await fetch(`${squareBaseUrl()}/v2/locations`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Square-Version": SQUARE_VERSION },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { locations?: { id: string }[] };
  return (data.locations ?? []).map((l) => l.id);
}

import type { PosTicket, PosTicketLineItem } from "./ticket-ingestion";

export type SquareDailySales = { revenue: number; orderCount: number };

/**
 * Fetches completed Square orders for one calendar day with all their line items.
 */
export async function fetchSquareDailyTickets(
  accessToken: string,
  dateStr: string,
  timeZone: string
): Promise<PosTicket[]> {
  const locationIds = await listSquareLocationIds(accessToken);
  if (locationIds.length === 0) return [];

  const { startAt, endAt } = localDayRangeUtc(dateStr, timeZone);
  const tickets: PosTicket[] = [];
  let cursor: string | undefined;

  do {
    const res = await fetch(`${squareBaseUrl()}/v2/orders/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
      },
      body: JSON.stringify({
        location_ids: locationIds,
        cursor,
        query: {
          filter: {
            state_filter: { states: ["COMPLETED"] },
            date_time_filter: { closed_at: { start_at: startAt, end_at: endAt } },
          },
        },
      }),
    });
    if (!res.ok) break;

    const data = (await res.json()) as {
      orders?: Array<{
        id: string;
        closed_at?: string;
        total_money?: { amount?: number };
        total_tax_money?: { amount?: number };
        total_tip_money?: { amount?: number };
        line_items?: Array<{
          catalog_object_id?: string;
          name?: string;
          variation_name?: string;
          quantity?: string;
          total_money?: { amount?: number };
          base_price_money?: { amount?: number };
        }>;
      }>;
      cursor?: string;
    };

    for (const order of data.orders ?? []) {
      const totalCents = order.total_money?.amount ?? 0;
      const taxCents = order.total_tax_money?.amount ?? 0;
      const tipCents = order.total_tip_money?.amount ?? 0;
      const subtotalCents = Math.max(0, totalCents - taxCents - tipCents);

      const lineItems: PosTicketLineItem[] = (order.line_items ?? []).map((li, idx) => {
        const name = li.variation_name ? `${li.name ?? "Article"} (${li.variation_name})` : (li.name ?? "Article");
        const qty = Number(li.quantity ?? 1);
        const itemTotalCents = li.total_money?.amount ?? (li.base_price_money?.amount ?? 0) * qty;
        const unitPrice = qty > 0 ? (itemTotalCents / 100) / qty : (itemTotalCents / 100);

        return {
          externalItemId: li.catalog_object_id || `sq-item-${order.id}-${idx}`,
          name,
          quantity: Math.max(1, qty),
          unitPrice: Math.round(unitPrice * 100) / 100,
        };
      });

      tickets.push({
        externalOrderId: order.id,
        closedAt: order.closed_at || new Date().toISOString(),
        subtotal: Math.round((subtotalCents / 100) * 100) / 100,
        taxAmount: Math.round((taxCents / 100) * 100) / 100,
        tipAmount: Math.round((tipCents / 100) * 100) / 100,
        total: Math.round((totalCents / 100) * 100) / 100,
        lineItems,
      });
    }
    cursor = data.cursor;
  } while (cursor);

  return tickets;
}

/** Sums completed Square orders for one calendar day, in the restaurant's local timezone. */
export async function fetchSquareDailySales(
  accessToken: string,
  dateStr: string,
  timeZone: string
): Promise<SquareDailySales> {
  const tickets = await fetchSquareDailyTickets(accessToken, dateStr, timeZone);
  const revenue = tickets.reduce((sum, t) => sum + t.subtotal, 0);
  return { revenue: Math.round(revenue * 100) / 100, orderCount: tickets.length };
}

/** The location inventory pushes/pulls are scoped to — Square inventory counts are per-location. */
export async function getSquareDefaultLocationId(accessToken: string): Promise<string | null> {
  const ids = await listSquareLocationIds(accessToken);
  return ids[0] ?? null;
}

export type SquareCatalogItem = {
  externalId: string;
  variationId: string;
  name: string;
  price: number;
  updatedAt: string | null;
};

/** Lists a merchant's full Square item catalog, paginated. */
export async function fetchSquareCatalogItems(accessToken: string): Promise<SquareCatalogItem[]> {
  const items: SquareCatalogItem[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${squareBaseUrl()}/v2/catalog/list`);
    url.searchParams.set("types", "ITEM");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, "Square-Version": SQUARE_VERSION },
    });
    if (!res.ok) break;

    const data = (await res.json()) as {
      objects?: Array<{
        id: string;
        updated_at?: string;
        item_data?: {
          name?: string;
          variations?: Array<{ id: string; item_variation_data?: { price_money?: { amount?: number } } }>;
        };
      }>;
      cursor?: string;
    };

    for (const obj of data.objects ?? []) {
      const variation = obj.item_data?.variations?.[0];
      if (!variation) continue;
      items.push({
        externalId: obj.id,
        variationId: variation.id,
        name: obj.item_data?.name ?? "Article",
        price: (variation.item_variation_data?.price_money?.amount ?? 0) / 100,
        updatedAt: obj.updated_at ?? null,
      });
    }
    cursor = data.cursor;
  } while (cursor);

  return items;
}

/**
 * Creates (externalId omitted) or updates (externalId + variationId set) a
 * Square catalog item (ITEM + one ITEM_VARIATION). Square's upsert is a
 * blind write when no `version` is sent, which is fine here since our own
 * pos_item_mappings.external_updated_at check decides whether to push at
 * all. Returns the item's { itemId, variationId } on success.
 */
export async function upsertSquareCatalogItem(
  accessToken: string,
  item: { externalId?: string | null; variationId?: string | null; name: string; price: number; active: boolean }
): Promise<{ itemId: string; variationId: string } | null> {
  const itemId = item.externalId ?? "#new-item";
  const variationId = item.variationId ?? "#new-variation";

  const res = await fetch(`${squareBaseUrl()}/v2/catalog/object`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify({
      idempotency_key: `${itemId}-${Date.now()}`,
      object: {
        type: "ITEM",
        id: itemId,
        present_at_all_locations: true,
        item_data: {
          name: item.name,
          is_archived: !item.active,
          variations: [
            {
              type: "ITEM_VARIATION",
              id: variationId,
              present_at_all_locations: true,
              item_variation_data: {
                item_id: itemId,
                name: "Régulier",
                pricing_type: "FIXED_PRICING",
                price_money: { amount: Math.round(item.price * 100), currency: "CAD" },
              },
            },
          ],
        },
      },
    }),
  });
  if (!res.ok) {
    console.error(`Square catalog upsert failed (${res.status}):`, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as {
    catalog_object?: { id?: string; item_data?: { variations?: Array<{ id: string }> } };
  };
  const resolvedItemId = data.catalog_object?.id ?? item.externalId ?? null;
  const resolvedVariationId = data.catalog_object?.item_data?.variations?.[0]?.id ?? item.variationId ?? null;
  if (!resolvedItemId || !resolvedVariationId) return null;
  return { itemId: resolvedItemId, variationId: resolvedVariationId };
}

export async function deleteSquareCatalogObject(accessToken: string, externalId: string): Promise<boolean> {
  const res = await fetch(`${squareBaseUrl()}/v2/catalog/object/${externalId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}`, "Square-Version": SQUARE_VERSION },
  });
  return res.ok;
}

/** Pushes a physical inventory count for one catalog item variation at the given location. */
export async function updateSquareInventoryCount(
  accessToken: string,
  variationId: string,
  locationId: string,
  quantity: number
): Promise<boolean> {
  const res = await fetch(`${squareBaseUrl()}/v2/inventory/changes/batch-create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify({
      idempotency_key: `${variationId}-${Date.now()}`,
      changes: [
        {
          type: "PHYSICAL_COUNT",
          physical_count: {
            catalog_object_id: variationId,
            location_id: locationId,
            quantity: String(Math.max(0, Math.round(quantity))),
            state: "IN_STOCK",
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    }),
  });
  return res.ok;
}

/** Pulls current on-hand counts for a batch of catalog item variations at one location. */
export async function fetchSquareInventoryCounts(
  accessToken: string,
  variationIds: string[],
  locationId: string
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (variationIds.length === 0) return counts;

  const res = await fetch(`${squareBaseUrl()}/v2/inventory/counts/batch-retrieve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify({ catalog_object_ids: variationIds, location_ids: [locationId] }),
  });
  if (!res.ok) return counts;

  const data = (await res.json()) as {
    counts?: Array<{ catalog_object_id?: string; quantity?: string }>;
  };
  for (const c of data.counts ?? []) {
    if (c.catalog_object_id) counts.set(c.catalog_object_id, Number(c.quantity ?? 0));
  }
  return counts;
}

