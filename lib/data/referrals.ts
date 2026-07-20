import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyRestaurantOwners } from "./notifications";
import type { Referral, ReferralCode, ReferralStatus } from "@/lib/types";

type ReferralCodeRow = {
  id: string;
  restaurant_id: string;
  code: string;
  created_by: string;
  created_at: string;
};

type ReferralRow = {
  id: string;
  referral_code_id: string;
  referred_email: string;
  referred_restaurant_id: string | null;
  status: ReferralStatus;
  created_at: string;
  activated_at: string | null;
  rewarded_at: string | null;
};

function mapReferralCode(row: ReferralCodeRow): ReferralCode {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    code: row.code,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function mapReferral(row: ReferralRow): Referral {
  return {
    id: row.id,
    referralCodeId: row.referral_code_id,
    referredEmail: row.referred_email,
    referredRestaurantId: row.referred_restaurant_id,
    status: row.status,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    rewardedAt: row.rewarded_at,
  };
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MINERVA-${suffix}`;
}

/**
 * Returns the restaurant's referral code, creating one on first use.
 * Idempotent: safe to call every time the referral modal/tab opens.
 */
export async function getOrCreateReferralCode(restaurantId: string): Promise<ReferralCode | null> {
  const supabase = await createClient();

  const existing = await supabase
    .from("referral_codes")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (existing.data) return mapReferralCode(existing.data as ReferralCodeRow);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("referral_codes")
    .insert({ restaurant_id: restaurantId, code: generateCode(), created_by: user.id })
    .select("*")
    .single();

  if (error || !data) {
    // Unique-violation race (two tabs creating at once) — re-select instead of failing.
    const retry = await supabase
      .from("referral_codes")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    return retry.data ? mapReferralCode(retry.data as ReferralCodeRow) : null;
  }

  return mapReferralCode(data as ReferralCodeRow);
}

export async function getReferrals(restaurantId: string): Promise<Referral[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referrals")
    .select("*, referral_codes!inner(restaurant_id)")
    .eq("referral_codes.restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ReferralRow[]).map(mapReferral);
}

/**
 * Closes the referral loop: called once, from onboarding completion (the
 * "restaurant-creation flow" the note above was waiting on — every new
 * signup now always has a restaurant by then, via the 0008 trigger). Looks
 * up the referral_code stashed in the new user's auth metadata at signup
 * (see app/sign-up/page.tsx), records the referral as active, and grants
 * the referrer one free month — applied at their next Stripe billing cycle
 * (lib/stripe — checks unapplied referral_rewards when a subscription
 * renews).
 */
export async function activateReferral(
  referralCode: string,
  referredEmail: string,
  referredRestaurantId: string
): Promise<void> {
  // referrals/referral_rewards have select-only RLS policies (see
  // 0002_chat_and_referrals.sql) — the referred user has no membership on
  // the referrer's restaurant, so this always goes through the admin
  // client, same as every other cross-restaurant write in the app.
  const admin = createAdminClient();

  const { data: codeRow } = await admin
    .from("referral_codes")
    .select("id, restaurant_id")
    .eq("code", referralCode)
    .maybeSingle();
  if (!codeRow) return;

  const { data: referral } = await admin
    .from("referrals")
    .insert({
      referral_code_id: codeRow.id,
      referred_email: referredEmail,
      referred_restaurant_id: referredRestaurantId,
      status: "active",
      activated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (!referral) return;

  await admin.from("referral_rewards").insert({
    restaurant_id: codeRow.restaurant_id,
    referral_id: referral.id,
    reward_type: "free_months",
    amount: 1,
  });

  // Notify the referrer's owners that someone joined their referral!
  try {
    await notifyRestaurantOwners({
      restaurantId: codeRow.restaurant_id,
      type: "referral.joined",
      title: "Parrainage réussi ! 🎉",
      body: `${referredEmail} a rejoint Flow par Minerva grâce à votre parrainage. 1 mois gratuit a été appliqué.`,
      link: "/overview",
    });
  } catch (err) {
    console.error("Failed to notify owners of referral:", err);
  }
}

export type RewardSummary = {
  pendingCount: number;
  activeCount: number;
  freeMonthsApplied: number;
};

/**
 * NOTE: referral activation (pending -> active, tied to a referred restaurant
 * becoming "active") depends on a restaurant-creation flow that doesn't exist
 * yet in the app (see the chat redesign plan, section 9) — this only reads
 * whatever state referrals/referral_rewards already hold; nothing here
 * transitions a referral's status.
 */
export async function getRewardSummary(restaurantId: string): Promise<RewardSummary> {
  const supabase = await createClient();

  const [referrals, rewards] = await Promise.all([
    supabase
      .from("referrals")
      .select("status, referral_codes!inner(restaurant_id)")
      .eq("referral_codes.restaurant_id", restaurantId),
    supabase
      .from("referral_rewards")
      .select("amount, reward_type, applied")
      .eq("restaurant_id", restaurantId)
      .eq("applied", true)
      .eq("reward_type", "free_months"),
  ]);

  const statuses = (referrals.data as { status: ReferralStatus }[] | null) ?? [];
  const rewardRows = (rewards.data as { amount: number }[] | null) ?? [];

  return {
    pendingCount: statuses.filter((r) => r.status === "pending").length,
    activeCount: statuses.filter((r) => r.status === "active" || r.status === "rewarded").length,
    freeMonthsApplied: rewardRows.reduce((sum, r) => sum + r.amount, 0),
  };
}
