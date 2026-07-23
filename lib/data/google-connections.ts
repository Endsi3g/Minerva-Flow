import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GoogleFeature } from "@/lib/google/config";
import { GOOGLE_SCOPES } from "@/lib/google/config";

export type GoogleConnection = {
  id: string;
  restaurantId: string;
  connectedEmail: string | null;
  grantedScopes: string[];
  expiresAt: string | null;
  calendarId: string | null;
  driveFolderId: string | null;
  ga4PropertyId: string | null;
  status: "connecte" | "erreur" | "attente";
};

type ConnectionRow = {
  id: string;
  restaurant_id: string;
  connected_email: string | null;
  granted_scopes: string[];
  expires_at: string | null;
  calendar_id: string | null;
  drive_folder_id: string | null;
  ga4_property_id: string | null;
  status: "connecte" | "erreur" | "attente";
};

function mapConnection(row: ConnectionRow): GoogleConnection {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    connectedEmail: row.connected_email,
    grantedScopes: row.granted_scopes,
    expiresAt: row.expires_at,
    calendarId: row.calendar_id,
    driveFolderId: row.drive_folder_id,
    ga4PropertyId: row.ga4_property_id,
    status: row.status,
  };
}

export async function getGoogleConnection(restaurantId: string): Promise<GoogleConnection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_connections")
    .select("id, restaurant_id, connected_email, granted_scopes, expires_at, calendar_id, drive_folder_id, ga4_property_id, status")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error || !data) return null;
  return mapConnection(data as ConnectionRow);
}

/** Server-only — whether a restaurant's Google connection includes a given feature's scope. */
export async function hasGoogleScope(restaurantId: string, feature: GoogleFeature): Promise<boolean> {
  const connection = await getGoogleConnection(restaurantId);
  if (!connection || connection.status !== "connecte") return false;
  return connection.grantedScopes.includes(GOOGLE_SCOPES[feature]);
}

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  connectedEmail?: string;
  scopes: string[];
};

/**
 * Server-only (service role) — called from the OAuth callback route or auto-refresh.
 * Tokens are stored via Supabase Vault (store_vault_secret RPC).
 */
export async function saveGoogleTokens(restaurantId: string, tokens: GoogleTokens): Promise<void> {
  const admin = createAdminClient();

  const { data: accessTokenId } = await admin.rpc("store_vault_secret", {
    secret: tokens.accessToken,
    secret_name: `google_access_${restaurantId}_${Date.now()}`,
  });

  let refreshTokenId: string | null = null;
  if (tokens.refreshToken) {
    const { data } = await admin.rpc("store_vault_secret", {
      secret: tokens.refreshToken,
      secret_name: `google_refresh_${restaurantId}_${Date.now()}`,
    });
    refreshTokenId = data ?? null;
  }

  const patch: Record<string, any> = {
    restaurant_id: restaurantId,
    connected_email: tokens.connectedEmail ?? null,
    granted_scopes: tokens.scopes,
    access_token_id: accessTokenId,
    expires_at: tokens.expiresAt ?? null,
    status: "connecte",
  };

  if (refreshTokenId) {
    patch.refresh_token_id = refreshTokenId;
  }

  await admin.from("google_connections").upsert(patch, { onConflict: "restaurant_id" });
}

/**
 * Server-only (service role) — retrieves valid Google tokens, automatically
 * executing a token refresh via oauth2.googleapis.com/token if expired (~1h expiry).
 * Fixes silent data loss & analytics breakage.
 */
export async function getGoogleTokens(
  restaurantId: string
): Promise<{ accessToken: string; refreshToken: string | null } | null> {
  const admin = createAdminClient();

  const { data: connection } = await admin
    .from("google_connections")
    .select("access_token_id, refresh_token_id, expires_at, granted_scopes, connected_email")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!connection?.access_token_id) return null;

  let refreshToken: string | null = null;
  if (connection.refresh_token_id) {
    const { data } = await admin.rpc("read_vault_secret", { secret_id: connection.refresh_token_id });
    refreshToken = data ?? null;
  }

  // Check expiration (if expires_at exists and is within 5 minutes or past)
  const isExpired =
    connection.expires_at &&
    new Date(connection.expires_at).getTime() - Date.now() < 5 * 60 * 1000;

  if (isExpired && refreshToken && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const newAccessToken = json.access_token;
        const expiresInSec = json.expires_in || 3600;
        const newExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

        await saveGoogleTokens(restaurantId, {
          accessToken: newAccessToken,
          refreshToken,
          expiresAt: newExpiresAt,
          connectedEmail: connection.connected_email ?? undefined,
          scopes: connection.granted_scopes || [],
        });

        return { accessToken: newAccessToken, refreshToken };
      }
    } catch (err) {
      console.error("[Google Tokens Refresh Error]", err);
    }
  }

  const { data: accessToken } = await admin.rpc("read_vault_secret", {
    secret_id: connection.access_token_id,
  });
  if (!accessToken) return null;

  return { accessToken, refreshToken };
}

/** Server-only — persists ids created lazily (calendar, Drive folder) back onto the connection row. */
export async function updateGoogleConnectionMeta(
  restaurantId: string,
  patch: { calendarId?: string; driveFolderId?: string; ga4PropertyId?: string }
): Promise<void> {
  const admin = createAdminClient();
  const update: Record<string, string> = {};
  if (patch.calendarId) update.calendar_id = patch.calendarId;
  if (patch.driveFolderId) update.drive_folder_id = patch.driveFolderId;
  if (patch.ga4PropertyId) update.ga4_property_id = patch.ga4PropertyId;
  if (Object.keys(update).length === 0) return;

  await admin.from("google_connections").update(update).eq("restaurant_id", restaurantId);
}
