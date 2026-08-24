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

export type SquareDailySales = { revenue: number; orderCount: number };

/** Sums completed Square orders for one calendar day, in the restaurant's local timezone. */
export async function fetchSquareDailySales(
  accessToken: string,
  dateStr: string,
  timeZone: string
): Promise<SquareDailySales> {
  const locationIds = await listSquareLocationIds(accessToken);
  if (locationIds.length === 0) return { revenue: 0, orderCount: 0 };

  const { startAt, endAt } = localDayRangeUtc(dateStr, timeZone);
  let revenueCents = 0;
  let orderCount = 0;
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
      orders?: { total_money?: { amount?: number } }[];
      cursor?: string;
    };
    for (const order of data.orders ?? []) {
      revenueCents += order.total_money?.amount ?? 0;
      orderCount += 1;
    }
    cursor = data.cursor;
  } while (cursor);

  return { revenue: revenueCents / 100, orderCount };
}
