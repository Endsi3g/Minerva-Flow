import { lightspeedAuthBaseUrl, lightspeedApiBaseUrl } from "./config";
import {
  getPosTokens,
  savePosConnectionTokens,
  updatePosConnectionStatus,
} from "@/lib/data/pos-connections";

/**
 * Lightspeed Restaurant (K-Series) — built from public API docs
 * (api-docs.lsk.lightspeed.app, api-portal.lsk.lightspeed.app), NOT
 * verified against a live account: the K-Series API itself is gated
 * behind Lightspeed's partner/approved-merchant program, so there was no
 * real credential to test this against. Confirm every URL/field name here
 * once a real API Client exists — treat this as a strong first draft, not
 * a proven integration (unlike lib/pos/square.ts, which mirrors an
 * integration already exercised against production).
 *
 * Notably different from Square's token exchange: client credentials go in
 * a Basic Auth header (base64 "client_id:client_secret"), not the JSON
 * body, and access tokens are short-lived (~25 min per the docs) — refresh
 * proactively, not just "within 24h" like Square.
 */

function basicAuthHeader(): string {
  const id = process.env.LIGHTSPEED_APPLICATION_ID!;
  const secret = process.env.LIGHTSPEED_APPLICATION_SECRET!;
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

export type LightspeedTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  /** businessLocationId — the closest Lightspeed equivalent to Square's merchant_id, used as external_account_id. */
  businessLocationId?: string;
};

function tokenResponseToTokens(data: {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}): LightspeedTokens | null {
  if (!data.access_token) return null;
  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined;
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt };
}

export async function refreshLightspeedTokens(refreshToken: string): Promise<LightspeedTokens | null> {
  const res = await fetch(`${lightspeedAuthBaseUrl()}/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  return tokenResponseToTokens(await res.json());
}

/**
 * Returns a usable Lightspeed access token for a restaurant, refreshing
 * first if it expires within 5 minutes — much tighter than Square's 24h
 * window since Lightspeed access tokens only live ~25 minutes to begin
 * with. Marks the connection "erreur" if the refresh itself fails.
 */
export async function getValidLightspeedAccessToken(restaurantId: string): Promise<string | null> {
  const tokens = await getPosTokens(restaurantId, "lightspeed");
  if (!tokens) return null;

  const expiresAt = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : 0;
  const needsRefresh = !expiresAt || expiresAt - Date.now() < 5 * 60 * 1000;
  if (!needsRefresh) return tokens.accessToken;
  if (!tokens.refreshToken) return tokens.accessToken;

  const refreshed = await refreshLightspeedTokens(tokens.refreshToken);
  if (!refreshed) {
    await updatePosConnectionStatus(restaurantId, "lightspeed", "erreur");
    return null;
  }

  await savePosConnectionTokens(restaurantId, "lightspeed", {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
    expiresAt: refreshed.expiresAt,
  });

  return refreshed.accessToken;
}

/**
 * UNVERIFIED endpoint — the docs found describe `GET
 * /f/v2/business-location/{id}/sales-daily` (requires knowing the id
 * already) but not conclusively which endpoint lists the location ids a
 * given API Client can see. This is a best-effort guess at the sibling
 * "list" endpoint following the same REST shape; confirm against the real
 * developer portal (api-portal.lsk.lightspeed.app) once credentials exist.
 */
async function listLightspeedBusinessLocationIds(accessToken: string): Promise<string[]> {
  const res = await fetch(`${lightspeedApiBaseUrl()}/f/v2/business-locations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { businessLocations?: { id: number | string }[] };
  return (data.businessLocations ?? []).map((l) => String(l.id));
}

export type LightspeedDailySales = { revenue: number; orderCount: number };

/**
 * Sums completed Lightspeed sales for one calendar day, across every
 * business location the connected account can see. Endpoint per
 * api-docs.lsk.lightspeed.app: GET
 * /f/v2/business-location/{businessLocationId}/sales-daily?date=YYYY-MM-DD
 * — revenue is summed from `sales[].payments[].netAmountWithTax`, since
 * the response has no single pre-aggregated total field. Unlike Square's
 * orders/search, this endpoint takes the business-day date directly and
 * resolves it against the merchant's own local day server-side (per
 * `nextStartOfDayAsIso8601` in the response) — no client-side timezone
 * math needed here.
 */
export async function fetchLightspeedDailySales(
  accessToken: string,
  dateStr: string
): Promise<LightspeedDailySales> {
  const locationIds = await listLightspeedBusinessLocationIds(accessToken);
  if (locationIds.length === 0) return { revenue: 0, orderCount: 0 };

  let revenue = 0;
  let orderCount = 0;

  for (const locationId of locationIds) {
    const url = new URL(`${lightspeedApiBaseUrl()}/f/v2/business-location/${locationId}/sales-daily`);
    url.searchParams.set("date", dateStr);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) continue;

    const data = (await res.json()) as {
      sales?: { cancelled?: boolean; payments?: { netAmountWithTax?: string }[] }[];
    };
    for (const sale of data.sales ?? []) {
      if (sale.cancelled) continue;
      orderCount += 1;
      for (const payment of sale.payments ?? []) {
        revenue += Number(payment.netAmountWithTax ?? 0);
      }
    }
  }

  return { revenue, orderCount };
}
