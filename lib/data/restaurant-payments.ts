import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConnectAccountState } from "@/lib/stripe/connect";
import type { ConnectCapabilityStatus, RestaurantConnectApiVersion } from "@/lib/stripe/connect-capabilities";

export type RestaurantConnectStatus = {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  apiVersion: RestaurantConnectApiVersion;
  transfersStatus: ConnectCapabilityStatus;
  recipientPayoutsStatus: ConnectCapabilityStatus;
  requirementsDueCount: number;
};

export async function getRestaurantConnectStatus(restaurantId: string): Promise<RestaurantConnectStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted, stripe_connect_account_api_version, stripe_connect_transfers_status, stripe_connect_recipient_payouts_status, stripe_connect_requirements_due_count"
    )
    .eq("id", restaurantId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    accountId: data.stripe_connect_account_id,
    chargesEnabled: data.stripe_connect_charges_enabled,
    payoutsEnabled: data.stripe_connect_payouts_enabled,
    detailsSubmitted: data.stripe_connect_details_submitted,
    apiVersion: data.stripe_connect_account_api_version,
    transfersStatus: data.stripe_connect_transfers_status,
    recipientPayoutsStatus: data.stripe_connect_recipient_payouts_status,
    requirementsDueCount: data.stripe_connect_requirements_due_count,
  };
}

/**
 * Only writes if no account exists yet — an owner who abandons onboarding
 * and clicks "Connecter" again must reuse the same Express account, never
 * get a second orphaned one.
 */
export async function saveConnectAccountId(
  restaurantId: string,
  accountId: string,
  apiVersion: RestaurantConnectApiVersion = "v1"
): Promise<{ accountId: string; apiVersion: RestaurantConnectApiVersion }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurants")
    .update({ stripe_connect_account_id: accountId, stripe_connect_account_api_version: apiVersion })
    .eq("id", restaurantId)
    .is("stripe_connect_account_id", null);
  if (error) throw new Error("Impossible d'enregistrer le compte Stripe Connect du restaurant.");

  // A concurrent onboarding request may win the compare-and-set. Always
  // return the persisted ID so we never issue a link to an unowned account.
  const { data, error: readError } = await admin.from("restaurants")
    .select("stripe_connect_account_id, stripe_connect_account_api_version")
    .eq("id", restaurantId)
    .maybeSingle();
  if (readError || !data?.stripe_connect_account_id) throw new Error("Le compte Stripe Connect n'a pas pu être confirmé.");
  return {
    accountId: data.stripe_connect_account_id,
    apiVersion: data.stripe_connect_account_api_version === "v2" ? "v2" : "v1",
  };
}

/**
 * Single write path for Connect status, called by both the manual
 * "Rafraîchir" action and the account.updated webhook handler. Returns
 * true only the first time charges_enabled flips on for this restaurant —
 * account.updated can fire many times over a restaurant's lifetime (any
 * bank-detail change), so the caller needs this to notify once, not every
 * time.
 */
export async function syncConnectAccountStatus(
  restaurantId: string,
  state: ConnectAccountState
): Promise<{ justActivated: boolean }> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    stripe_connect_charges_enabled: state.chargesEnabled,
    stripe_connect_payouts_enabled: state.payoutsEnabled,
    stripe_connect_details_submitted: state.detailsSubmitted,
  };

  let justActivated = false;
  if (state.chargesEnabled) {
    const { data: current } = await admin
      .from("restaurants")
      .select("stripe_connect_connected_at")
      .eq("id", restaurantId)
      .maybeSingle();
    if (!current?.stripe_connect_connected_at) {
      patch.stripe_connect_connected_at = new Date().toISOString();
      justActivated = true;
    }
  }

  await admin.from("restaurants").update(patch).eq("id", restaurantId);
  return { justActivated };
}

/** Persist the recipient capabilities used by V2 restaurant payments. */
export async function syncRestaurantRecipientStatusV2(
  restaurantId: string,
  state: { transfersStatus: ConnectCapabilityStatus; payoutsStatus: ConnectCapabilityStatus; requirementsDueCount: number }
): Promise<{ justActivated: boolean }> {
  const admin = createAdminClient();
  const { data: current } = await admin.from("restaurants")
    .select("stripe_connect_transfers_status, stripe_connect_recipient_payouts_status, stripe_connect_connected_at")
    .eq("id", restaurantId).maybeSingle();
  const ready = state.transfersStatus === "active" && state.payoutsStatus === "active";
  const wasReady = current?.stripe_connect_transfers_status === "active"
    && current?.stripe_connect_recipient_payouts_status === "active";
  const patch: Record<string, unknown> = {
    stripe_connect_transfers_status: state.transfersStatus,
    stripe_connect_recipient_payouts_status: state.payoutsStatus,
    stripe_connect_requirements_due_count: Math.max(0, Math.floor(state.requirementsDueCount)),
    stripe_connect_charges_enabled: ready,
    stripe_connect_payouts_enabled: state.payoutsStatus === "active",
  };
  if (ready && !current?.stripe_connect_connected_at) patch.stripe_connect_connected_at = new Date().toISOString();
  const { error } = await admin.from("restaurants").update(patch).eq("id", restaurantId);
  if (error) throw new Error("Impossible de synchroniser les capacités Stripe Connect.");
  return { justActivated: ready && !wasReady };
}

/** Routes an incoming account.updated webhook event to the right restaurant. */
export async function getRestaurantIdByStripeConnectAccountId(accountId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurants")
    .select("id")
    .eq("stripe_connect_account_id", accountId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getRestaurantConnectApiVersionByStripeAccountId(accountId: string): Promise<RestaurantConnectApiVersion | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("restaurants")
    .select("stripe_connect_account_api_version")
    .eq("stripe_connect_account_id", accountId)
    .maybeSingle();
  return data?.stripe_connect_account_api_version === "v2" ? "v2" : data ? "v1" : null;
}
