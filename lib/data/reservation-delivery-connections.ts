import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReservationDeliveryProvider = "opentable" | "resy" | "uber_direct";
export type ReservationDeliveryCategory = "reservation" | "livraison";
export type ReservationDeliveryStatus = "connecte" | "erreur" | "attente";

export type ReservationDeliveryConnection = {
  id: string;
  provider: ReservationDeliveryProvider;
  category: ReservationDeliveryCategory;
  externalAccountId: string | null;
  status: ReservationDeliveryStatus;
  createdAt: string;
  lastSyncedAt: string | null;
};

type ReservationDeliveryConnectionRow = {
  id: string;
  provider: ReservationDeliveryProvider;
  category: ReservationDeliveryCategory;
  external_account_id: string | null;
  status: ReservationDeliveryStatus;
  created_at: string;
  last_synced_at: string | null;
};

function mapConnection(row: ReservationDeliveryConnectionRow): ReservationDeliveryConnection {
  return {
    id: row.id,
    provider: row.provider,
    category: row.category,
    externalAccountId: row.external_account_id,
    status: row.status,
    createdAt: row.created_at,
    lastSyncedAt: row.last_synced_at,
  };
}

export async function getReservationDeliveryConnections(
  restaurantId: string
): Promise<ReservationDeliveryConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservation_delivery_connections")
    .select("id, provider, category, external_account_id, status, created_at, last_synced_at")
    .eq("restaurant_id", restaurantId);

  if (error || !data) return [];
  return (data as ReservationDeliveryConnectionRow[]).map(mapConnection);
}

/**
 * Stores a manually-entered API key (Vault-backed, never a plain column) —
 * unlike Square's OAuth redirect flow, OpenTable Connect / Resy API / Uber
 * Direct are partner APIs with no self-serve authorization screen: the
 * credential is whatever the provider hands the restaurant once its
 * partnership application is approved, pasted in by hand.
 */
export async function saveReservationDeliveryCredentials(
  restaurantId: string,
  provider: ReservationDeliveryProvider,
  category: ReservationDeliveryCategory,
  input: { externalAccountId: string; apiKey: string },
  createdBy: string | null
): Promise<void> {
  const admin = createAdminClient();

  const { data: apiKeyId } = await admin.rpc("store_vault_secret", {
    secret: input.apiKey,
    secret_name: `${provider}_apikey_${restaurantId}_${Date.now()}`,
  });

  await admin.from("reservation_delivery_connections").upsert(
    {
      restaurant_id: restaurantId,
      provider,
      category,
      external_account_id: input.externalAccountId,
      api_key_id: apiKeyId ?? null,
      status: "connecte",
      created_by: createdBy,
    },
    { onConflict: "restaurant_id,provider" }
  );
}

export async function removeReservationDeliveryConnection(
  restaurantId: string,
  provider: ReservationDeliveryProvider
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("reservation_delivery_connections")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("provider", provider);
}
