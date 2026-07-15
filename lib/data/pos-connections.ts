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
};

type PosConnectionRow = {
  id: string;
  provider: PosProvider;
  external_account_id: string | null;
  status: PosConnectionStatus;
  created_at: string;
};

export async function getPosConnections(restaurantId: string): Promise<PosConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pos_connections")
    .select("id, provider, external_account_id, status, created_at")
    .eq("restaurant_id", restaurantId);

  if (error || !data) return [];
  return (data as PosConnectionRow[]).map((r) => ({
    id: r.id,
    provider: r.provider,
    externalAccountId: r.external_account_id,
    status: r.status,
    createdAt: r.created_at,
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
