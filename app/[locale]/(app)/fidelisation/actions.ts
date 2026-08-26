"use server";

import { revalidatePath } from "next/cache";
import {
  createCustomer,
  deleteCustomer,
  logVisit,
  redeemReward,
  createLoyaltyReward,
  deleteLoyaltyReward,
  claimRewardRedemption,
  type CustomerInput,
} from "@/lib/data/customers";
import { updateRestaurantAction } from "@/app/[locale]/(app)/settings/actions";
import { updateRetentionSettings, updateLoyaltyTierThresholds, updateVisitRewardTiers } from "@/lib/data/restaurants";
import {
  createReferralProgram,
  updateReferralProgramActive,
  deleteReferralProgram,
  type ReferralProgramInput,
} from "@/lib/data/referral-programs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getLoyaltySharesForRestaurant,
  createLoyaltyShare,
  deleteLoyaltyShare,
} from "@/lib/data/loyalty-shares";
import type { Customer, LoyaltyReward, LoyaltyShare, ReferralProgram, VisitRewardTier } from "@/lib/types";

export async function createCustomerAction(
  restaurantId: string,
  input: CustomerInput
): Promise<Customer | null> {
  if (!input.name.trim()) return null;
  const customer = await createCustomer(restaurantId, input);
  if (customer) revalidatePath("/fidelisation");
  return customer;
}

export async function deleteCustomerAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteCustomer(restaurantId, id);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

export async function logVisitAction(
  restaurantId: string,
  customerId: string,
  amountSpent: number,
  note?: string | null
): Promise<Customer | null> {
  const customer = await logVisit(restaurantId, customerId, amountSpent, note);
  if (customer) revalidatePath("/fidelisation");
  return customer;
}

export async function redeemRewardAction(
  restaurantId: string,
  customerId: string,
  rewardId: string
): Promise<Customer | null> {
  const customer = await redeemReward(restaurantId, customerId, rewardId);
  if (customer) revalidatePath("/fidelisation");
  return customer;
}

export async function createLoyaltyRewardAction(
  restaurantId: string,
  input: { name: string; description?: string; pointsCost: number }
): Promise<LoyaltyReward | null> {
  if (!input.name.trim() || !Number.isFinite(input.pointsCost) || input.pointsCost <= 0) return null;
  const reward = await createLoyaltyReward(restaurantId, input);
  if (reward) revalidatePath("/fidelisation");
  return reward;
}

export async function deleteLoyaltyRewardAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteLoyaltyReward(restaurantId, id);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

export async function claimRewardRedemptionAction(
  restaurantId: string,
  code: string
): Promise<{ rewardName: string; pointsSpent: number; customerName: string; claimedAt: string } | null> {
  if (!code.trim()) return null;
  const result = await claimRewardRedemption(restaurantId, code);
  if (result) revalidatePath("/fidelisation");
  return result;
}

export async function updateLoyaltyRateAction(restaurantId: string, rate: number): Promise<boolean> {
  if (!Number.isFinite(rate) || rate < 0) return false;
  const restaurant = await updateRestaurantAction(restaurantId, { loyaltyPointsPerDollar: rate });
  if (restaurant) revalidatePath("/fidelisation");
  return Boolean(restaurant);
}

export async function createReferralProgramAction(
  restaurantId: string,
  input: ReferralProgramInput
): Promise<ReferralProgram | null> {
  if (!input.name.trim() || !Number.isFinite(input.goalCount) || input.goalCount < 1) return null;
  const program = await createReferralProgram(restaurantId, input);
  if (program) revalidatePath("/fidelisation");
  return program;
}

export async function updateReferralProgramActiveAction(
  restaurantId: string,
  id: string,
  active: boolean
): Promise<boolean> {
  const ok = await updateReferralProgramActive(restaurantId, id, active);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

export async function deleteReferralProgramAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteReferralProgram(restaurantId, id);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

/**
 * Staff-triggered "give this client an easy portal link" — sends a
 * passwordless sign-in email straight to the customer's own inbox (they
 * click it, land on /portal already authenticated). Verifies the customer
 * belongs to restaurantId via the session-scoped client (RLS-backed)
 * before ever touching the admin client, so staff can't be tricked into
 * sending a link tied to a customer outside their restaurant.
 */
export async function sendPortalLinkAction(
  restaurantId: string,
  customerId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: customerRow } = await supabase
    .from("customers")
    .select("email, name")
    .eq("restaurant_id", restaurantId)
    .eq("id", customerId)
    .maybeSingle();

  const customer = customerRow as { email: string | null; name: string } | null;
  if (!customer) return { ok: false, error: "Client introuvable." };
  if (!customer.email) return { ok: false, error: `${customer.name} n'a pas de courriel enregistré.` };

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://minerva-flow.vercel.app";
  const admin = createAdminClient();
  const { error } = await admin.auth.signInWithOtp({
    email: customer.email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/portal`,
      data: { is_customer: true },
      shouldCreateUser: true,
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getLoyaltySharesAction(restaurantId: string): Promise<LoyaltyShare[]> {
  return getLoyaltySharesForRestaurant(restaurantId);
}

export async function createLoyaltyShareAction(restaurantId: string, title: string): Promise<LoyaltyShare | null> {
  if (!title.trim()) return null;
  const share = await createLoyaltyShare(restaurantId, title.trim());
  if (share) revalidatePath("/fidelisation");
  return share;
}

export async function deleteLoyaltyShareAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteLoyaltyShare(restaurantId, id);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

export async function updateRetentionSettingsAction(
  restaurantId: string,
  patch: { enabled?: boolean; inactivityDays?: number }
): Promise<boolean> {
  const ok = await updateRetentionSettings(restaurantId, patch);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

export async function updateLoyaltyTierThresholdsAction(
  restaurantId: string,
  patch: { tier2?: number; tier3?: number }
): Promise<boolean> {
  const ok = await updateLoyaltyTierThresholds(restaurantId, patch);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

export async function updateVisitRewardTiersAction(
  restaurantId: string,
  patch: { enabled?: boolean; tiers?: VisitRewardTier[] }
): Promise<boolean> {
  const ok = await updateVisitRewardTiers(restaurantId, patch);
  if (ok) {
    revalidatePath("/fidelisation");
    revalidatePath("/fidelisation/recompenses");
  }
  return ok;
}
