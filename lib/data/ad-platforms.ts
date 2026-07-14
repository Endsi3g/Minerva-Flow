import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdChannel, AdConnectionStatus, AdConversion, AdPlatformConnection, AdProvider } from "@/lib/types";

type ConnectionRow = {
  id: string;
  restaurant_id: string;
  provider: AdProvider;
  external_account_id: string | null;
  expires_at: string | null;
  status: AdConnectionStatus;
  created_at: string;
};

function mapConnection(row: ConnectionRow): AdPlatformConnection {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    provider: row.provider,
    externalAccountId: row.external_account_id,
    expiresAt: row.expires_at,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Connections visible to the current user — never includes tokens. */
export async function getAdPlatformConnections(restaurantId: string): Promise<AdPlatformConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ad_platform_connections")
    .select("id, restaurant_id, provider, external_account_id, expires_at, status, created_at")
    .eq("restaurant_id", restaurantId);

  if (error || !data) return [];
  return (data as ConnectionRow[]).map(mapConnection);
}

export type AdTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  externalAccountId?: string;
};

/**
 * Server-only (service role) — called from the OAuth callback routes.
 * Tokens are stored in Supabase Vault via the store_vault_secret RPC
 * (see 0006_ad_attribution.sql); only the key ids are kept on the row.
 */
export async function saveAdPlatformTokens(
  restaurantId: string,
  provider: AdProvider,
  tokens: AdTokens
): Promise<void> {
  const admin = createAdminClient();

  const { data: accessTokenId } = await admin.rpc("store_vault_secret", {
    secret: tokens.accessToken,
    secret_name: `${provider}_access_${restaurantId}_${Date.now()}`,
  });

  let refreshTokenId: string | null = null;
  if (tokens.refreshToken) {
    const { data } = await admin.rpc("store_vault_secret", {
      secret: tokens.refreshToken,
      secret_name: `${provider}_refresh_${restaurantId}_${Date.now()}`,
    });
    refreshTokenId = data ?? null;
  }

  await admin.from("ad_platform_connections").upsert(
    {
      restaurant_id: restaurantId,
      provider,
      external_account_id: tokens.externalAccountId ?? null,
      access_token_id: accessTokenId,
      refresh_token_id: refreshTokenId,
      expires_at: tokens.expiresAt ?? null,
      status: "connecte",
    },
    { onConflict: "restaurant_id,provider" }
  );
}

/** Server-only (service role) — called by the sync job to fetch real API data. */
export async function getAdPlatformTokens(
  restaurantId: string,
  provider: AdProvider
): Promise<{ accessToken: string; refreshToken: string | null } | null> {
  const admin = createAdminClient();

  const { data: connection } = await admin
    .from("ad_platform_connections")
    .select("access_token_id, refresh_token_id")
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider)
    .maybeSingle();

  if (!connection?.access_token_id) return null;

  const { data: accessToken } = await admin.rpc("read_vault_secret", {
    secret_id: connection.access_token_id,
  });
  if (!accessToken) return null;

  let refreshToken: string | null = null;
  if (connection.refresh_token_id) {
    const { data } = await admin.rpc("read_vault_secret", { secret_id: connection.refresh_token_id });
    refreshToken = data ?? null;
  }

  return { accessToken, refreshToken };
}

type ConversionRow = {
  id: string;
  restaurant_id: string;
  ad_platform_connection_id: string | null;
  channel: AdChannel;
  city: string | null;
  lng: number | null;
  lat: number | null;
  converted_online: boolean;
  revenue: number | null;
  occurred_at: string;
};

function mapConversion(row: ConversionRow): AdConversion {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    adPlatformConnectionId: row.ad_platform_connection_id,
    channel: row.channel,
    city: row.city,
    lng: row.lng,
    lat: row.lat,
    convertedOnline: row.converted_online,
    revenue: row.revenue,
    occurredAt: row.occurred_at,
  };
}

export async function getAdConversions(
  restaurantId: string,
  filter?: { channel?: AdChannel }
): Promise<AdConversion[]> {
  const supabase = await createClient();
  let query = supabase.from("ad_conversions").select("*").eq("restaurant_id", restaurantId);
  if (filter?.channel) query = query.eq("channel", filter.channel);

  const { data, error } = await query.order("occurred_at", { ascending: false }).limit(2000);
  if (error || !data) return [];
  return (data as ConversionRow[]).map(mapConversion);
}

export type NewAdConversion = {
  channel: AdChannel;
  city: string | null;
  convertedOnline: boolean;
  revenue: number;
};

/**
 * Server-only (service role) — replaces today's synced conversions for a
 * restaurant (delete + insert scoped to today) so re-running the sync cron
 * doesn't duplicate rows. Used by app/api/cron/sync-analytics/route.ts.
 */
export async function replaceTodayAdConversions(
  restaurantId: string,
  conversions: NewAdConversion[]
): Promise<void> {
  const admin = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  await admin
    .from("ad_conversions")
    .delete()
    .eq("restaurant_id", restaurantId)
    .gte("occurred_at", todayStart.toISOString());

  if (conversions.length === 0) return;

  await admin.from("ad_conversions").insert(
    conversions.map((c) => ({
      restaurant_id: restaurantId,
      channel: c.channel,
      city: c.city,
      converted_online: c.convertedOnline,
      revenue: c.revenue,
    }))
  );
}
