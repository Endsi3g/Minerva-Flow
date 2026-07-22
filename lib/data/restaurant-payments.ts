import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ConnectAccountState } from "@/lib/stripe/connect";

export type RestaurantConnectStatus = {
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export async function getRestaurantConnectStatus(restaurantId: string): Promise<RestaurantConnectStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted"
    )
    .eq("id", restaurantId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    accountId: data.stripe_connect_account_id,
    chargesEnabled: data.stripe_connect_charges_enabled,
    payoutsEnabled: data.stripe_connect_payouts_enabled,
    detailsSubmitted: data.stripe_connect_details_submitted,
  };
}

/**
 * Only writes if no account exists yet — an owner who abandons onboarding
 * and clicks "Connecter" again must reuse the same Express account, never
 * get a second orphaned one.
 */
export async function saveConnectAccountId(restaurantId: string, accountId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("restaurants")
    .update({ stripe_connect_account_id: accountId })
    .eq("id", restaurantId)
    .is("stripe_connect_account_id", null);
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
