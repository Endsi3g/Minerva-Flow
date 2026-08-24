"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateReferralLink } from "@/lib/data/customer-referrals";
import { getCustomersForUser, selfRedeemReward } from "@/lib/data/customer-portal";
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
  input: { marketingConsent: boolean; birthday: string | null }
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
  });
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
