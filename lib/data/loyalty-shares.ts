import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/tokens";
import type { LoyaltyReward, LoyaltyShare } from "@/lib/types";

type LoyaltyShareRow = {
  id: string;
  restaurant_id: string;
  token: string;
  title: string;
  created_at: string;
};

function mapLoyaltyShare(row: LoyaltyShareRow): LoyaltyShare {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    token: row.token,
    title: row.title,
    createdAt: row.created_at,
  };
}

export async function getLoyaltySharesForRestaurant(restaurantId: string): Promise<LoyaltyShare[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_shares")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as LoyaltyShareRow[]).map(mapLoyaltyShare);
}

export async function createLoyaltyShare(restaurantId: string, title: string): Promise<LoyaltyShare | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const token = generateToken();
  const { data, error } = await supabase
    .from("loyalty_shares")
    .insert({ restaurant_id: restaurantId, token, title, created_by: user?.id ?? null })
    .select("*")
    .single();

  if (error || !data) {
    if (error) console.error("createLoyaltyShare failed:", error.message);
    return null;
  }
  return mapLoyaltyShare(data as LoyaltyShareRow);
}

export async function deleteLoyaltyShare(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("loyalty_shares").delete().eq("restaurant_id", restaurantId).eq("id", id);
  return !error;
}

export type PublicLoyaltyLanding = {
  share: LoyaltyShare;
  restaurantId: string;
  restaurantName: string;
  pointsPerDollar: number;
  topRewards: LoyaltyReward[];
};

/**
 * Public lookup, not a snapshot — like getMenuShareByToken, always reflects
 * the restaurant's current rate/catalogue rather than what it looked like
 * the day the link was generated.
 */
export async function getLoyaltyShareByToken(token: string): Promise<PublicLoyaltyLanding | null> {
  const admin = createAdminClient();
  const { data: shareRow } = await admin.from("loyalty_shares").select("*").eq("token", token).maybeSingle();
  if (!shareRow) return null;
  const share = mapLoyaltyShare(shareRow as LoyaltyShareRow);

  const [restaurantResult, rewardsResult] = await Promise.all([
    admin.from("restaurants").select("name, loyalty_points_per_dollar").eq("id", share.restaurantId).maybeSingle(),
    admin
      .from("loyalty_rewards")
      .select("*")
      .eq("restaurant_id", share.restaurantId)
      .eq("active", true)
      .order("points_cost")
      .limit(3),
  ]);

  if (!restaurantResult.data) return null;
  const restaurant = restaurantResult.data as { name: string; loyalty_points_per_dollar: number };
  const topRewards = ((rewardsResult.data as { id: string; restaurant_id: string; name: string; points_cost: number; active: boolean; created_at: string }[]) ?? []).map(
    (r) => ({
      id: r.id,
      restaurantId: r.restaurant_id,
      name: r.name,
      pointsCost: r.points_cost,
      active: r.active,
      createdAt: r.created_at,
    })
  );

  return {
    share,
    restaurantId: share.restaurantId,
    restaurantName: restaurant.name,
    pointsPerDollar: restaurant.loyalty_points_per_dollar,
    topRewards,
  };
}

/**
 * Self-enrollment: creates the customer row (no user_id yet — see migration
 * 0024) if this email isn't already a loyalty member at this restaurant,
 * then the caller sends the magic link. Idempotent — safe to call again for
 * an email that already joined, e.g. if they lost the confirmation link.
 */
export async function joinLoyaltyProgram(
  restaurantId: string,
  input: { name: string; email: string }
): Promise<{ ok: boolean; alreadyMember: boolean }> {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .ilike("email", email)
    .maybeSingle();

  if (existing) return { ok: true, alreadyMember: true };

  const { error } = await admin.from("customers").insert({
    restaurant_id: restaurantId,
    name: input.name.trim() || email.split("@")[0],
    email,
  });

  if (error) {
    console.error("joinLoyaltyProgram failed:", error.message);
    return { ok: false, alreadyMember: false };
  }
  return { ok: true, alreadyMember: false };
}
