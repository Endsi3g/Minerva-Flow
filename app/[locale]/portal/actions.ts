"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateReferralLink } from "@/lib/data/customer-referrals";
import {
  getCustomersForUser,
  selfRedeemReward,
  submitPortalOrder,
  deleteMyAccount,
  type PortalOrderCartLine,
  type SubmitPortalOrderResult,
} from "@/lib/data/customer-portal";
import { updateCustomer } from "@/lib/data/customers";
import type { CustomerReferralLink, RewardRedemption } from "@/lib/types";

/**
 * customerId is never trusted from the client — derived from the session
 * and matched to the program's own restaurant_id, so a person who is a
 * loyalty customer at more than one restaurant always gets a link tied to
 * the correct one instead of an arbitrary customer record.
 */
export async function getOrCreateReferralLinkAction(programId: string): Promise<CustomerReferralLink | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const customers = await getCustomersForUser(user.id);
  if (customers.length === 0) return null;

  const admin = createAdminClient();
  const { data: programRow } = await admin
    .from("referral_programs")
    .select("restaurant_id")
    .eq("id", programId)
    .maybeSingle();

  const restaurantId = (programRow as { restaurant_id: string } | null)?.restaurant_id;
  if (!restaurantId) return null;

  const customer = customers.find((c) => c.restaurantId === restaurantId);
  if (!customer) return null;

  return getOrCreateReferralLink(customer.id, programId);
}

/**
 * Lets a customer set their own marketing consent/birthday from the
 * portal — covers people who joined before these fields existed, or via
 * the staff-facing form which may not have asked. customerId is trusted
 * only after confirming it belongs to the authenticated session, same
 * pattern as getOrCreateReferralLinkAction.
 */
export async function updateMyProfileAction(
  customerId: string,
  input: {
    marketingConsent: boolean;
    birthday: string | null;
    city?: string | null;
    name?: string;
    avatarUrl?: string | null;
  }
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const customers = await getCustomersForUser(user.id);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return false;

  return updateCustomer(customer.restaurantId, customer.id, {
    marketingConsent: input.marketingConsent,
    consentSource: "portal",
    birthday: input.birthday,
    city: input.city,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
  });
}

/**
 * Supabase sends a confirmation link to the NEW address before the change
 * takes effect (auth.updateUser doesn't switch auth.users.email
 * immediately) — customers.email then syncs automatically once that link
 * is clicked (see supabase/migrations/0068_customer_profile_editing.sql's
 * on_auth_user_email_change trigger), so this action only needs to kick
 * off the request, never write customers.email itself.
 */
export async function requestEmailChangeAction(newEmail: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Self-serve reward redemption. rewardId is never trusted blindly — the
 * self_redeem_reward RPC re-derives the caller's own customer row from
 * auth.uid() and re-checks the points balance server-side, so this action
 * is just a thin pass-through, not the trust boundary.
 */
export async function selfRedeemRewardAction(rewardId: string): Promise<RewardRedemption | null> {
  return selfRedeemReward(rewardId);
}

/**
 * customerId is never trusted from the client — same ownership check as
 * updateMyProfileAction, so a portal order always lands under the correct
 * customer/restaurant even if the browser tab was left open on a stale id.
 */
export async function submitPortalOrderAction(
  customerId: string,
  cart: PortalOrderCartLine[],
  tipAmount: number,
  paymentMethod: string | null
): Promise<SubmitPortalOrderResult> {
  if (cart.length === 0) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const customers = await getCustomersForUser(user.id);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return { ok: false };

  const result = await submitPortalOrder(customer, cart, tipAmount, paymentMethod);
  if (result.ok) revalidatePath("/portal");
  return result;
}

/**
 * Irreversible: wipes this session's own login and every customers row's
 * personal data tied to it (see deleteMyAccount's own doc comment). The
 * client is expected to have already confirmed with the person before
 * calling this — there is no further confirmation step here, this action
 * IS the point of no return.
 */
export async function deleteMyAccountAction(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  return deleteMyAccount(user.id);
}
