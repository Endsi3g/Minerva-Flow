import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReferralProgram } from "@/lib/types";

export type ReferralProgramRow = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  goal_count: number;
  reward_id: string | null;
  reward_description: string | null;
  active: boolean;
  created_at: string;
  new_customer_bonus_points: number;
  referrer_bonus_points: number;
};

export function mapReferralProgram(row: ReferralProgramRow): ReferralProgram {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    goalCount: row.goal_count,
    rewardId: row.reward_id,
    rewardDescription: row.reward_description,
    active: row.active,
    createdAt: row.created_at,
    newCustomerBonusPoints: row.new_customer_bonus_points ?? 0,
    referrerBonusPoints: row.referrer_bonus_points ?? 0,
  };
}

export async function getReferralPrograms(restaurantId: string): Promise<ReferralProgram[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referral_programs")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ReferralProgramRow[]).map(mapReferralProgram);
}

/**
 * The restaurant's active referral program, readable from public,
 * unauthenticated pages (the "partager ce plat" CTA on /m/[token]) — admin
 * client because referral_programs' own RLS policy requires restaurant
 * membership, and this is read-only public metadata (name/reward
 * description), not sensitive data.
 */
export async function getActiveReferralProgramForRestaurant(restaurantId: string): Promise<ReferralProgram | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("referral_programs")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapReferralProgram(data as ReferralProgramRow);
}

export type ReferralProgramInput = {
  name: string;
  description?: string | null;
  goalCount: number;
  rewardId?: string | null;
  rewardDescription?: string | null;
  newCustomerBonusPoints?: number;
  referrerBonusPoints?: number;
};

export async function createReferralProgram(
  restaurantId: string,
  input: ReferralProgramInput
): Promise<ReferralProgram | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("referral_programs")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      description: input.description ?? null,
      goal_count: input.goalCount,
      reward_id: input.rewardId ?? null,
      reward_description: input.rewardDescription ?? null,
      new_customer_bonus_points: input.newCustomerBonusPoints ?? 0,
      referrer_bonus_points: input.referrerBonusPoints ?? 0,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapReferralProgram(data as ReferralProgramRow);
}

export async function updateReferralProgramActive(
  restaurantId: string,
  id: string,
  active: boolean
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("referral_programs")
    .update({ active })
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

export async function deleteReferralProgram(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("referral_programs")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}
