import { toastAuthBaseUrl, toastApiBaseUrl } from "./config";
import {
  getPosTokens,
  savePosConnectionTokens,
  updatePosConnectionStatus,
} from "@/lib/data/pos-connections";

export type ToastTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  restaurantGuid?: string;
};

export type ToastDailySales = {
  revenue: number;
  orderCount: number;
};

/**
 * Authenticates against Toast's Partner Machine Client login endpoint
 * (/authentication/v1/authentication/login) to retrieve a 24-hour Bearer token.
 */
export async function loginToastMachineClient(): Promise<{ accessToken: string; expiresAt: string } | null> {
  const clientId = process.env.TOAST_CLIENT_ID;
  const clientSecret = process.env.TOAST_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(`${toastAuthBaseUrl()}/authentication/v1/authentication/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        userAccessType: "TOAST_MACHINE_CLIENT",
        clientId,
        clientSecret,
      }),
    });

    if (!res.ok) {
      console.error(`Toast machine login failed with status ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      status?: string;
      token?: {
        tokenType?: string;
        idToken?: string;
        expiresIn?: number;
      };
    };

    const idToken = data.token?.idToken;
    if (!idToken) return null;

    const expiresIn = data.token?.expiresIn ?? 86400;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      accessToken: idToken,
      expiresAt,
    };
  } catch (err) {
    console.error("Failed to authenticate Toast Machine Client:", err);
    return null;
  }
}

/**
 * Exchanges an authorization code from Toast Partner Connect for access tokens.
 */
export async function exchangeToastCode(
  code: string,
  redirectUri: string
): Promise<ToastTokens | null> {
  const clientId = process.env.TOAST_CLIENT_ID;
  const clientSecret = process.env.TOAST_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(`${toastAuthBaseUrl()}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      // Fallback: If partner uses machine-login style credentials, obtain bearer token directly
      const machineAuth = await loginToastMachineClient();
      if (machineAuth) {
        return {
          accessToken: machineAuth.accessToken,
          expiresAt: machineAuth.expiresAt,
        };
      }
      return null;
    }

    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      restaurant_guid?: string;
      restaurantGuid?: string;
    };

    if (!data.access_token) return null;

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      restaurantGuid: data.restaurant_guid || data.restaurantGuid,
    };
  } catch (err) {
    console.error("Failed to exchange Toast OAuth code:", err);
    return null;
  }
}

/**
 * Returns a valid Toast access token and restaurant GUID for an establishment.
 * Proactively refreshes the token if expired or close to expiration (< 1 hour).
 */
export async function getValidToastAccessToken(
  restaurantId: string
): Promise<{ accessToken: string; restaurantGuid: string | null } | null> {
  const tokens = await getPosTokens(restaurantId, "toast");
  if (!tokens) return null;

  const expiresAt = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : 0;
  const needsRefresh = !expiresAt || expiresAt - Date.now() < 60 * 60 * 1000;

  if (needsRefresh) {
    const refreshed = await loginToastMachineClient();
    if (refreshed) {
      await savePosConnectionTokens(restaurantId, "toast", {
        accessToken: refreshed.accessToken,
        refreshToken: tokens.refreshToken ?? undefined,
        expiresAt: refreshed.expiresAt,
        externalAccountId: tokens.externalAccountId ?? undefined,
      });
      return {
        accessToken: refreshed.accessToken,
        restaurantGuid: tokens.externalAccountId ?? null,
      };
    } else if (expiresAt > 0 && expiresAt <= Date.now()) {
      await updatePosConnectionStatus(restaurantId, "toast", "erreur");
      return null;
    }
  }

  return {
    accessToken: tokens.accessToken,
    restaurantGuid: tokens.externalAccountId ?? null,
  };
}

interface ToastOrder {
  guid?: string;
  totalAmount?: number;
  amount?: number;
  voided?: boolean;
  deleted?: boolean;
  paidDate?: string;
  closedDate?: string;
}

/**
 * Sums completed Toast orders for one calendar day.
 * Toast Orders API accepts `businessDate` in format YYYYMMDD (e.g. 20260909 for 2026-09-09).
 */
export async function fetchToastDailySales(
  accessToken: string,
  restaurantGuid: string,
  dateStr: string
): Promise<ToastDailySales> {
  if (!restaurantGuid) return { revenue: 0, orderCount: 0 };

  const businessDate = dateStr.replace(/-/g, "");
  let revenue = 0;
  let orderCount = 0;
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const url = new URL(`${toastApiBaseUrl()}/orders/v2/orders`);
    url.searchParams.set("businessDate", businessDate);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Toast-Restaurant-External-ID": restaurantGuid,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`Toast orders fetch returned ${res.status} for restaurant GUID ${restaurantGuid}`);
      break;
    }

    const orders = (await res.json()) as ToastOrder[];
    if (!Array.isArray(orders) || orders.length === 0) {
      hasMore = false;
      break;
    }

    for (const order of orders) {
      if (order.voided || order.deleted) continue;
      const orderTotal = typeof order.totalAmount === "number"
        ? order.totalAmount
        : typeof order.amount === "number"
          ? order.amount
          : 0;

      if (orderTotal > 0) {
        revenue += orderTotal;
        orderCount += 1;
      }
    }

    if (orders.length < pageSize) {
      hasMore = false;
    } else {
      page += 1;
    }
  }

  return {
    revenue: Math.round(revenue * 100) / 100,
    orderCount,
  };
}
