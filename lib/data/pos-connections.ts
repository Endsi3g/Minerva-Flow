import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PosProvider = "square" | "lightspeed" | "clover";
export type PosConnectionStatus = "connecte" | "erreur" | "attente";

export type PosConnection = {
  id: string;
  provider: PosProvider;
  externalAccountId: string | null;
  status: PosConnectionStatus;
  createdAt: string;
  lastSyncedAt: string | null;
};

type PosConnectionRow = {
  id: string;
  provider: PosProvider;
  external_account_id: string | null;
  status: PosConnectionStatus;
  created_at: string;
  last_synced_at: string | null;
};

export async function getPosConnections(restaurantId: string): Promise<PosConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_connections")
    .select("id, provider, external_account_id, status, created_at, last_synced_at")
    .eq("restaurant_id", restaurantId);

  if (error || !data) return [];
  return (data as PosConnectionRow[]).map((r) => ({
    id: r.id,
    provider: r.provider,
    externalAccountId: r.external_account_id,
    status: r.status,
    createdAt: r.created_at,
    lastSyncedAt: r.last_synced_at,
  }));
}

export type PosTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  externalAccountId?: string;
};

/**
 * Stores OAuth tokens in Supabase Vault (never in a plain column) via the
 * store_vault_secret RPC already used for ad platform connections — same
 * pattern, different table.
 */
export async function savePosConnectionTokens(
  restaurantId: string,
  provider: PosProvider,
  tokens: PosTokens
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

  await admin.from("pos_connections").upsert(
    {
      restaurant_id: restaurantId,
      provider,
      external_account_id: tokens.externalAccountId ?? null,
      access_token_id: accessTokenId ?? null,
      refresh_token_id: refreshTokenId,
      expires_at: tokens.expiresAt ?? null,
      status: "connecte",
    },
    { onConflict: "restaurant_id,provider" }
  );
}

/**
 * Server-only (service role) token retrieval — used by the sync cron and
 * webhook handler, which run without an authenticated user session so the
 * RLS-scoped client in the rest of this file can't be used.
 */
export async function getPosTokens(
  restaurantId: string,
  provider: PosProvider
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: string | null } | null> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("pos_connections")
    .select("access_token_id, refresh_token_id, expires_at")
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

  return { accessToken, refreshToken, expiresAt: connection.expires_at };
}

/** Restaurant id for a Square merchant id — used to route incoming webhooks. */
export async function getRestaurantIdBySquareMerchant(merchantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pos_connections")
    .select("restaurant_id")
    .eq("provider", "square")
    .eq("external_account_id", merchantId)
    .maybeSingle();
  return data?.restaurant_id ?? null;
}

export async function updatePosConnectionStatus(
  restaurantId: string,
  provider: PosProvider,
  status: PosConnectionStatus
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("pos_connections")
    .update({ status })
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider);
}

export async function touchPosConnectionSync(restaurantId: string, provider: PosProvider): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("pos_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider);
}

/** Restaurant's timezone, via the admin client — used by sync jobs that run without a user session. */
export async function getRestaurantTimezoneAdmin(restaurantId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("restaurants").select("timezone").eq("id", restaurantId).maybeSingle();
  return data?.timezone ?? "America/Montreal";
}
