import { createClient } from "@/lib/supabase/server";
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

export type ReferralProgramInput = {
  name: string;
  description?: string | null;
  goalCount: number;
  rewardId?: string | null;
  rewardDescription?: string | null;
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
