"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import {
  getRestaurantConnectStatus,
  saveConnectAccountId,
  syncConnectAccountStatus,
  syncRestaurantRecipientStatusV2,
  type RestaurantConnectStatus,
} from "@/lib/data/restaurant-payments";
import {
  isStripeConnectConfigured,
  createOnboardingLink,
  retrieveAccountState,
  createRestaurantRecipientAccountV2,
  createRestaurantRecipientOnboardingLinkV2,
  retrieveRestaurantRecipientAccountStateV2,
} from "@/lib/stripe/connect";
import { createClient } from "@/lib/supabase/server";

async function requireOwner() {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") return null;
  return membership;
}

async function originUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export async function getStripeConnectStatusAction(): Promise<
  (RestaurantConnectStatus & { configured: boolean }) | null
> {
  const membership = await requireOwner();
  if (!membership) return null;
  const status = await getRestaurantConnectStatus(membership.restaurantId);
  if (!status) return null;
  return { ...status, configured: isStripeConnectConfigured() };
}

/**
 * Creates (or reuses) the restaurant's Connect account and returns a fresh
 * onboarding link URL. Reusing the existing account id — rather than
 * calling accounts.create on every click — matters because an owner who
 * abandons onboarding partway and clicks "Connecter" again must land back
 * in the SAME account, not get a second orphaned one.
 */
export async function startStripeConnectOnboardingAction(): Promise<string | null> {
  if (!isStripeConnectConfigured()) return null;
  const membership = await requireOwner();
  if (!membership) return null;

  const origin = await originUrl();
  const returnUrl = `${origin}/settings?tab=integrations&stripe_connect=return`;
  const refreshUrl = `${origin}/settings?tab=integrations&stripe_connect=refresh`;

  const existing = await getRestaurantConnectStatus(membership.restaurantId);
  let accountId = existing?.accountId ?? null;
  let apiVersion = existing?.apiVersion ?? "v2";

  if (!accountId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    accountId = await createRestaurantRecipientAccountV2({
      email: user?.email ?? null,
      restaurantId: membership.restaurantId,
    });
    const persisted = await saveConnectAccountId(membership.restaurantId, accountId, "v2");
    accountId = persisted.accountId;
    apiVersion = persisted.apiVersion;
  }

  return apiVersion === "v2"
    ? createRestaurantRecipientOnboardingLinkV2(accountId, refreshUrl, returnUrl)
    : createOnboardingLink(accountId, refreshUrl, returnUrl);
}

/** Re-pulls account state from Stripe — called on return from onboarding, or manually via "Rafraîchir". */
export async function refreshStripeConnectStatusAction(): Promise<boolean> {
  const membership = await requireOwner();
  if (!membership) return false;

  const status = await getRestaurantConnectStatus(membership.restaurantId);
  if (!status?.accountId) return false;

  if (status.apiVersion === "v2") {
    const state = await retrieveRestaurantRecipientAccountStateV2(status.accountId);
    await syncRestaurantRecipientStatusV2(membership.restaurantId, state);
  } else {
    const state = await retrieveAccountState(status.accountId);
    await syncConnectAccountStatus(membership.restaurantId, state);
  }

  revalidatePath("/settings");
  return true;
}
