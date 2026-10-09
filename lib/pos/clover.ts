import { cloverApiBaseUrl, cloverEnvironment } from "./config";
import { parseCloverOrderReference } from "./clover-order-contract";
import { CloverOrderApi } from "./clover-order-api";
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
 * Clover v2 exchanges codes on the API host, not the authorization website.
 * Codes are single-use: never retry an uncertain exchange or expose secrets in a URL.
 */
export async function exchangeCloverCode(
  code: string,
  redirectUri: string
): Promise<CloverTokens | null> {
  const clientId = process.env.CLOVER_APP_ID;
  const clientSecret = process.env.CLOVER_APP_SECRET;

  if (!clientId || !clientSecret || !code.trim()) return null;

  try {
    const res = await fetch(`${cloverApiBaseUrl()}/oauth/v2/token`, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!data || typeof data !== "object") return null;
    const value = data as Record<string, unknown>;
    if (typeof value.access_token !== "string" || !value.access_token.trim()) return null;
    if (value.refresh_token !== undefined && (typeof value.refresh_token !== "string" || !value.refresh_token.trim())) return null;

    const expiresMillis = typeof value.access_token_expiration === "number"
      ? value.access_token_expiration * 1000
      : typeof value.expires_in === "number" ? Date.now() + value.expires_in * 1000 : NaN;
    if (!Number.isFinite(expiresMillis) || expiresMillis <= Date.now() || expiresMillis > 8.64e15) return null;

    return {
      accessToken: value.access_token,
      refreshToken: value.refresh_token as string | undefined,
      expiresAt: new Date(expiresMillis).toISOString(),
    };
  } catch {
    // Do not log request/response objects containing authorization codes or tokens.
    console.warn("clover_oauth_exchange_failed");
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

  const expiresAt = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : null;
  if (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) {
    await updatePosConnectionStatus(restaurantId, "clover", "erreur");
    return null;
  }

  // Rotating refresh tokens need durable coordination before refresh can be
  // implemented. Until then, require reconnect rather than use an expired token.
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
  item?: { id?: string };
}

interface CloverOrderItem {
  id?: string;
  title?: string;
  note?: string;
  employee?: { id?: string };
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
  timeZone: string,
  includeEmployeeAttribution = false,
): Promise<PosTicket[]> {
  if (!merchantId) return [];

  const { startAt, endAt } = localDayRangeUtc(dateStr, timeZone);
  const startMillis = new Date(startAt).getTime();
  const endMillis = new Date(endAt).getTime();

  const tickets: PosTicket[] = [];
  const employees = new Map<string, string | null>();
  const employeeApi = includeEmployeeAttribution ? new CloverOrderApi(accessToken, merchantId) : null;
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
      throw new Error("clover_sales_read_failed");
    }

    const data = (await res.json()) as CloverOrdersResponse;
    const elements = data.elements ?? [];

    for (const order of elements) {
      // Only award loyalty for fully paid orders. Clover also returns OPEN,
      // PARTIALLY_PAID, refunded, and credited orders from this date query.
      if (order.state === "deleted" || order.paymentState !== "PAID") continue;
      // A stable provider ID is required for exactly-once imports. Never
      // invent a random ID here: doing so would make cron/webhook retries
      // create duplicate orders and loyalty credits.
      if (!order.id) continue;
      const orderTotal = typeof order.total === "number" ? order.total : 0;
      if (orderTotal <= 0) continue;

      const lineItems: PosTicketLineItem[] = (order.lineItems?.elements ?? []).map((li, idx) => {
        const qty = li.unitQty ? Math.max(1, Math.round(li.unitQty / 1000)) : 1;
        const price = typeof li.price === "number" ? li.price / 100 : 0;
        return {
          externalItemId: li.item?.id || li.id || `clover-item-${order.id}-${idx}`,
          name: li.name || "Article",
          quantity: qty,
          unitPrice: Math.round(price * 100) / 100,
        };
      });

      const employeeId = order.employee?.id;
      if (employeeApi && employeeId && !employees.has(employeeId)) {
        employees.set(employeeId, await employeeApi.employeeName(employeeId));
      }
      const minervaOrderId = parseCloverOrderReference(order.title, order.note);
      tickets.push({
        clover: { merchantId, environment: cloverEnvironment(), ...(minervaOrderId ? { minervaOrderId } : {}) },
        ...(employeeApi && employeeId ? { posEmployeeId: employeeId, posEmployeeName: employees.get(employeeId) ?? undefined } : {}),
        externalOrderId: order.id,
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

/**
 * Direct API Token validation for Clover — verifies that the token has access
 * to the given merchant ID via the Clover REST API v3.
 */
export async function validateAndFetchCloverMerchant(
  merchantId: string,
  apiToken: string
): Promise<{ valid: boolean; merchantName?: string; error?: string }> {
  try {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(merchantId) || !apiToken.trim()) {
      return { valid: false, error: "Identifiants Clover invalides." };
    }
    const res = await fetch(`${cloverApiBaseUrl()}/v3/merchants/${encodeURIComponent(merchantId)}`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) return { valid: false, error: "Clé API Clover invalide ou non autorisée." };
      if (res.status === 404) return { valid: false, error: "Identifiant Marchand (Merchant ID) introuvable chez Clover." };
      return { valid: false, error: `Erreur Clover (${res.status}).` };
    }

    const data = (await res.json()) as { id?: string; name?: string } | null;
    if (!data || data.id !== merchantId) return { valid: false, error: "Le marchand Clover ne correspond pas à la connexion." };
    return { valid: true, merchantName: data.name };
  } catch {
    console.warn("clover_merchant_validation_failed");
    return { valid: false, error: "Impossible de joindre le serveur Clover." };
  }
}

export type CloverCatalogItem = {
  externalId: string;
  name: string;
  price: number;
  quantity: number | null;
  modifiedTime: string | null;
};

/**
 * Lists a merchant's full Clover catalog (items + stock levels), paginated —
 * used both to browse-and-link in the inventory mapping UI and by the
 * reconcile cron to pull remote-side changes.
 */
export async function fetchCloverCatalogItems(
  accessToken: string,
  merchantId: string
): Promise<CloverCatalogItem[]> {
  const items: CloverCatalogItem[] = [];
  let offset = 0;
  const limit = 200;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${cloverApiBaseUrl()}/v3/merchants/${merchantId}/items`);
    url.searchParams.set("expand", "itemStock");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (!res.ok) break;

    const data = (await res.json()) as {
      elements?: Array<{
        id: string;
        name?: string;
        price?: number;
        modifiedTime?: number;
        itemStock?: { quantity?: number };
      }>;
    };
    const elements = data.elements ?? [];

    for (const el of elements) {
      items.push({
        externalId: el.id,
        name: el.name ?? "Article",
        price: typeof el.price === "number" ? el.price / 100 : 0,
        quantity: el.itemStock?.quantity ?? null,
        modifiedTime: el.modifiedTime ? new Date(el.modifiedTime).toISOString() : null,
      });
    }

    if (elements.length < limit) hasMore = false;
    else offset += limit;
  }

  return items;
}

/**
 * Creates (externalId omitted) or updates (externalId set) a Clover catalog
 * item. Price is Minerva Flow's dollar amount, converted to cents (Clover's
 * native unit). Returns the Clover item id on success.
 */
export async function upsertCloverCatalogItem(
  accessToken: string,
  merchantId: string,
  item: { externalId?: string | null; name: string; price: number; active: boolean }
): Promise<string | null> {
  const body = {
    name: item.name,
    price: Math.round(item.price * 100),
    priceType: "FIXED",
    hidden: !item.active,
  };

  const url = item.externalId
    ? `${cloverApiBaseUrl()}/v3/merchants/${merchantId}/items/${item.externalId}`
    : `${cloverApiBaseUrl()}/v3/merchants/${merchantId}/items`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Clover item upsert failed (${res.status}):`, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as { id?: string };
  return data.id ?? item.externalId ?? null;
}

export async function deleteCloverCatalogItem(
  accessToken: string,
  merchantId: string,
  externalId: string
): Promise<boolean> {
  const res = await fetch(`${cloverApiBaseUrl()}/v3/merchants/${merchantId}/items/${externalId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  return res.ok;
}

/** Pushes a stock quantity to Clover's item_stocks endpoint for one item. */
export async function updateCloverItemStock(
  accessToken: string,
  merchantId: string,
  externalId: string,
  quantity: number
): Promise<boolean> {
  const res = await fetch(`${cloverApiBaseUrl()}/v3/merchants/${merchantId}/item_stocks/${externalId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ quantity: Math.round(quantity) }),
  });
  return res.ok;
}
