import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapCustomer, mapReward, type CustomerRow, mapTransaction, type LoyaltyTransactionRow } from "@/lib/data/customers";
import { mapReferralProgram, type ReferralProgramRow } from "@/lib/data/referral-programs";
import { mapLink, type CustomerReferralLinkRow } from "@/lib/data/customer-referrals";
import type {
  Customer,
  CustomerReferralLink,
  LoyaltyReward,
  LoyaltyTransaction,
  ReferralProgram,
  RewardRedemption,
} from "@/lib/types";

/**
 * Every customer record for the currently authenticated portal user — uses
 * the session client (not admin) so the customers_select_own RLS policy
 * (auth.uid() = user_id) is the actual source of truth for "is this really
 * their own record", not just an application-level assumption. Returns
 * every restaurant relationship rather than picking one: the same email
 * can be a loyalty customer at more than one participating restaurant, and
 * silently showing an arbitrary one would leak the wrong restaurant's data
 * into view. Callers decide what to do with more than one (see
 * app/portal/page.tsx for the chooser).
 */
export async function getCustomersForUser(userId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as CustomerRow[]).map((row) => mapCustomer(row, []));
}

export type PortalReferralProgress = {
  program: ReferralProgram;
  link: CustomerReferralLink | null;
};

export type PortalData = {
  transactions: LoyaltyTransaction[];
  programs: PortalReferralProgress[];
  rewards: LoyaltyReward[];
  redemptions: RewardRedemption[];
};

type RewardRedemptionRow = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  reward_id: string;
  reward_name: string;
  points_spent: number;
  code: string;
  status: "pending" | "claimed";
  created_at: string;
  claimed_at: string | null;
};

function mapRedemption(row: RewardRedemptionRow): RewardRedemption {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    customerId: row.customer_id,
    rewardId: row.reward_id,
    rewardName: row.reward_name,
    pointsSpent: row.points_spent,
    code: row.code,
    status: row.status,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
  };
}

/**
 * Aggregates everything the portal dashboard shows. Runs entirely
 * server-side after getCustomerForUser has already verified (via RLS) that
 * the caller owns this customer record, so the admin client here is just a
 * convenience for the cross-restaurant-program joins, not a trust boundary.
 */
export async function getPortalData(customer: Customer): Promise<PortalData> {
  const admin = createAdminClient();

  const [{ data: txData }, { data: programRows }, { data: rewardRows }, { data: redemptionRows }] = await Promise.all([
    admin
      .from("loyalty_transactions")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
    admin.from("referral_programs").select("*").eq("restaurant_id", customer.restaurantId).eq("active", true),
    admin
      .from("loyalty_rewards")
      .select("*")
      .eq("restaurant_id", customer.restaurantId)
      .eq("active", true)
      .order("points_cost"),
    admin
      .from("reward_redemptions")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
  ]);

  const transactions = ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction);
  const programs = ((programRows as ReferralProgramRow[]) ?? []).map(mapReferralProgram);
  const rewards = ((rewardRows as Parameters<typeof mapReward>[0][]) ?? []).map(mapReward);
  const redemptions = ((redemptionRows as RewardRedemptionRow[]) ?? []).map(mapRedemption);

  let links: CustomerReferralLink[] = [];
  if (programs.length > 0) {
    const { data: linkRows } = await admin
      .from("customer_referral_links")
      .select("*")
      .eq("customer_id", customer.id)
      .in(
        "referral_program_id",
        programs.map((p) => p.id)
      );
    links = ((linkRows as CustomerReferralLinkRow[]) ?? []).map(mapLink);
  }

  return {
    transactions,
    programs: programs.map((program) => ({
      program,
      link: links.find((l) => l.referralProgramId === program.id) ?? null,
    })),
    rewards,
    redemptions,
  };
}

/**
 * Self-serve redemption: the currently authenticated portal user spends
 * their own points for a reward via the self_redeem_reward RPC (which
 * resolves auth.uid() to their own customers row internally — no
 * customer id is ever taken from the client). Uses the session client,
 * not admin, since the RPC's own auth checks ARE the trust boundary here.
 */
export async function selfRedeemReward(rewardId: string): Promise<RewardRedemption | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("self_redeem_reward", { p_reward_id: rewardId });
  if (error || !data) return null;
  return mapRedemption(data as RewardRedemptionRow);
}
