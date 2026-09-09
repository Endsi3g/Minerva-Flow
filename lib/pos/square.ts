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

