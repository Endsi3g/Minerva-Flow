import { cloverAuthBaseUrl, cloverApiBaseUrl } from "./config";
import { localDayRangeUtc } from "./shared";
import { getPosTokens, updatePosConnectionStatus } from "@/lib/data/pos-connections";

export type CloverTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  merchantId?: string;
};

export type CloverDailySales = {
  revenue: number;
  orderCount: number;
};

/**
 * Exchanges the OAuth authorization code for Clover access tokens.
 * Clover v2 OAuth accepts a POST request with JSON payload { client_id, client_secret, code }.
 * Falls back to GET query parameters if POST returns non-OK (legacy Clover endpoint compatibility).
 */
export async function exchangeCloverCode(
  code: string,
  redirectUri: string
): Promise<CloverTokens | null> {
  const clientId = process.env.CLOVER_APP_ID;
  const clientSecret = process.env.CLOVER_APP_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    // Try standard POST to /oauth/v2/token
    let res = await fetch(`${cloverAuthBaseUrl()}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    // Fallback to legacy GET /oauth/token if POST /oauth/v2/token fails
    if (!res.ok) {
      const fallbackUrl = new URL(`${cloverAuthBaseUrl()}/oauth/token`);
      fallbackUrl.searchParams.set("client_id", clientId);
      fallbackUrl.searchParams.set("client_secret", clientSecret);
      fallbackUrl.searchParams.set("code", code);
      res = await fetch(fallbackUrl.toString(), {
        headers: { Accept: "application/json" },
      });
    }

    if (!res.ok) return null;

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      access_token_expiration?: number;
      expires_in?: number;
    };

    if (!data.access_token) return null;

    let expiresAt: string | undefined;
    if (data.access_token_expiration) {
      expiresAt = new Date(data.access_token_expiration * 1000).toISOString();
    } else if (data.expires_in) {
      expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  } catch (err) {
    console.error("Failed to exchange Clover OAuth code:", err);
    return null;
  }
}

/**
 * Returns a valid Clover access token and merchant ID for a restaurant.
 */
export async function getValidCloverAccessToken(
  restaurantId: string
): Promise<{ accessToken: string; merchantId: string | null } | null> {
  const tokens = await getPosTokens(restaurantId, "clover");
  if (!tokens) return null;

  const expiresAt = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : 0;
  const isExpired = expiresAt > 0 && expiresAt <= Date.now();

  if (isExpired && !tokens.refreshToken) {
    await updatePosConnectionStatus(restaurantId, "clover", "erreur");
    return null;
  }

  // Clover access tokens for merchant apps are generally long-lived,
  // but if expired with a refresh token present, we would refresh here.
  return {
    accessToken: tokens.accessToken,
    merchantId: tokens.externalAccountId ?? null,
  };
}

import type { PosTicket, PosTicketLineItem } from "./ticket-ingestion";

interface CloverLineItem {
  id?: string;
  name?: string;
  price?: number;
  unitQty?: number;
}

interface CloverOrderItem {
  id?: string;
  total?: number;
  state?: string;
  paymentState?: string;
  createdTime?: number;
  lineItems?: {
    elements?: CloverLineItem[];
  };
}

interface CloverOrdersResponse {
  elements?: CloverOrderItem[];
  href?: string;
}

/**
 * Fetches completed Clover orders for one calendar day with all line items.
 */
export async function fetchCloverDailyTickets(
  accessToken: string,
  merchantId: string,
  dateStr: string,
  timeZone: string
): Promise<PosTicket[]> {
  if (!merchantId) return [];

  const { startAt, endAt } = localDayRangeUtc(dateStr, timeZone);
  const startMillis = new Date(startAt).getTime();
  const endMillis = new Date(endAt).getTime();

  const tickets: PosTicket[] = [];
  let offset = 0;
  const limit = 200;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${cloverApiBaseUrl()}/v3/merchants/${merchantId}/orders`);
    url.searchParams.append("filter", `createdTime>=${startMillis}`);
    url.searchParams.append("filter", `createdTime<=${endMillis}`);
    url.searchParams.append("expand", "lineItems");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`Clover orders fetch returned ${res.status} for merchant ${merchantId}`);
      break;
    }

    const data = (await res.json()) as CloverOrdersResponse;
    const elements = data.elements ?? [];

    for (const order of elements) {
      if (order.state === "deleted" || order.paymentState === "OPEN_VOID") continue;
      const orderTotal = typeof order.total === "number" ? order.total : 0;
      if (orderTotal <= 0) continue;

      const lineItems: PosTicketLineItem[] = (order.lineItems?.elements ?? []).map((li, idx) => {
        const qty = li.unitQty ? Math.max(1, Math.round(li.unitQty / 1000)) : 1;
        const price = typeof li.price === "number" ? li.price / 100 : 0;
        return {
          externalItemId: li.id || `clover-item-${order.id}-${idx}`,
          name: li.name || "Article",
          quantity: qty,
          unitPrice: Math.round(price * 100) / 100,
        };
      });

      tickets.push({
        externalOrderId: order.id || `clover-order-${Math.random()}`,
        closedAt: order.createdTime ? new Date(order.createdTime).toISOString() : new Date().toISOString(),
        subtotal: Math.round((orderTotal / 100) * 100) / 100,
        total: Math.round((orderTotal / 100) * 100) / 100,
        lineItems,
      });
    }

    if (elements.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return tickets;
}

/**
 * Sums completed Clover orders for one calendar day, in the restaurant's local timezone.
 */
export async function fetchCloverDailySales(
  accessToken: string,
  merchantId: string,
  dateStr: string,
  timeZone: string
): Promise<CloverDailySales> {
  const tickets = await fetchCloverDailyTickets(accessToken, merchantId, dateStr, timeZone);
  const revenue = tickets.reduce((sum, t) => sum + t.subtotal, 0);
  return {
    revenue: Math.round(revenue * 100) / 100,
    orderCount: tickets.length,
  };
}

