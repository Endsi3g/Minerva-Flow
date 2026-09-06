import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import {
  getLoyaltyTier,
  loyaltyTierLabel,
  getVisitBonusMultiplier,
  DEFAULT_LOYALTY_TIER_THRESHOLDS,
} from "@/lib/loyalty-tiers";
import { sendRetentionEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import type { Customer, LoyaltyReward, LoyaltyTransaction, LoyaltyTransactionType, VisitRewardTier } from "@/lib/types";

export type CustomerRow = {
  id: string;
  restaurant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  visit_count: number;
  total_spent: number;
  loyalty_points: number;
  last_visit_at: string | null;
  created_at: string;
  user_id: string | null;
  marketing_consent: boolean;
  consent_source: string | null;
  consent_at: string | null;
  birthday: string | null;
  city: string | null;
  favorite_offer_ids: string[];
  notification_frequency: "all" | "important_only";
};

export type LoyaltyTransactionRow = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  type: LoyaltyTransactionType;
  amount_spent: number | null;
  points_delta: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export function mapTransaction(row: LoyaltyTransactionRow): LoyaltyTransaction {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    customerId: row.customer_id,
    type: row.type,
    amountSpent: row.amount_spent,
    pointsDelta: row.points_delta,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function mapCustomer(row: CustomerRow, transactions: LoyaltyTransaction[]): Customer {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    visitCount: row.visit_count,
    totalSpent: row.total_spent,
    loyaltyPoints: row.loyalty_points,
    lastVisitAt: row.last_visit_at,
    createdAt: row.created_at,
    transactions,
    userId: row.user_id,
    marketingConsent: row.marketing_consent,
    consentSource: row.consent_source,
    consentAt: row.consent_at,
    birthday: row.birthday,
    city: row.city,
    favoriteOfferIds: row.favorite_offer_ids ?? [],
    notificationFrequency: row.notification_frequency ?? "all",
  };
}

export async function getCustomers(restaurantId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name");

  if (error || !data) return [];
  const rows = data as CustomerRow[];
  if (rows.length === 0) return [];

  const { data: txData } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .in("customer_id", rows.map((r) => r.id))
    .order("created_at", { ascending: false });

  const txByCustomer = new Map<string, LoyaltyTransaction[]>();
  for (const row of (txData as LoyaltyTransactionRow[]) ?? []) {
    const list = txByCustomer.get(row.customer_id) ?? [];
    list.push(mapTransaction(row));
    txByCustomer.set(row.customer_id, list);
  }

  return rows.map((row) => mapCustomer(row, txByCustomer.get(row.id) ?? []));
}

/** Single customer with full transaction history — for the dedicated /fidelisation/[id] page. */
export async function getCustomer(restaurantId: string, customerId: string): Promise<Customer | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", customerId)
    .maybeSingle();

  if (!row) return null;

  const { data: txData } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return mapCustomer(row as CustomerRow, ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction));
}

export type CustomerInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  marketingConsent?: boolean;
  consentSource?: string | null;
  birthday?: string | null;
  city?: string | null;
  favoriteOfferIds?: string[];
  notificationFrequency?: "all" | "important_only";
};

export async function createCustomer(restaurantId: string, input: CustomerInput): Promise<Customer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      marketing_consent: input.marketingConsent ?? false,
      consent_source: input.marketingConsent ? (input.consentSource ?? "staff") : null,
      consent_at: input.marketingConsent ? new Date().toISOString() : null,
      birthday: input.birthday ?? null,
      city: input.city ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "customer.create",
    entityType: "customer",
    entityId: data.id,
    description: `A ajouté la fiche client "${input.name}"`,
  });

  return mapCustomer(data as CustomerRow, []);
}

export async function updateCustomer(
  restaurantId: string,
  id: string,
  patch: Partial<CustomerInput>
): Promise<boolean> {
  const supabase = await createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.email !== undefined) dbPatch.email = patch.email;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (patch.notes !== undefined) dbPatch.notes = patch.notes;
  if (patch.birthday !== undefined) dbPatch.birthday = patch.birthday;
  if (patch.city !== undefined) dbPatch.city = patch.city;
  if (patch.favoriteOfferIds !== undefined) dbPatch.favorite_offer_ids = patch.favoriteOfferIds;
  if (patch.notificationFrequency !== undefined) dbPatch.notification_frequency = patch.notificationFrequency;
  if (patch.marketingConsent !== undefined) {
    dbPatch.marketing_consent = patch.marketingConsent;
    if (patch.marketingConsent) {
      dbPatch.consent_source = patch.consentSource ?? "staff";
      dbPatch.consent_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("customers")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id);

  return !error;
}

export async function deleteCustomer(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("restaurant_id", restaurantId).eq("id", id);
  return !error;
}

/**
 * Logs a visit for a customer: computes points earned from the
 * restaurant's loyalty_points_per_dollar rate, inserts the ledger entry,
 * and bumps the customer's denormalized counters (visit_count, total_spent,
 * loyalty_points, last_visit_at) in the same call.
 */
export async function logVisit(
  restaurantId: string,
  customerId: string,
  amountSpent: number,
  note?: string | null
): Promise<Customer | null> {
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select(
      "name, loyalty_points_per_dollar, loyalty_tier_2_threshold, loyalty_tier_3_threshold, visit_rewards_enabled, visit_reward_tiers"
    )
    .eq("id", restaurantId)
    .maybeSingle();

  const restaurantRow = restaurant as {
    name: string;
    loyalty_points_per_dollar: number;
    loyalty_tier_2_threshold: number | null;
    loyalty_tier_3_threshold: number | null;
    visit_rewards_enabled: boolean | null;
    visit_reward_tiers: VisitRewardTier[] | null;
  } | null;
  const rate = restaurantRow?.loyalty_points_per_dollar ?? 1;
  const pointsEarned = Math.round(amountSpent * rate * getVisitBonusMultiplier(amountSpent));

  // Atomic: the RPC inserts the ledger row and updates the customer's
  // running totals in one transaction — see migration comment for why a
  // separate insert-then-update from here was a correctness bug, not just
  // a race (a mid-flight failure could leave one without the other).
  const { data: rpcRows, error: rpcError } = await supabase.rpc("increment_customer_visit", {
    p_customer_id: customerId,
    p_restaurant_id: restaurantId,
    p_amount_spent: amountSpent,
    p_points_delta: pointsEarned,
    p_note: note ?? null,
  });

  if (rpcError || !rpcRows || (rpcRows as CustomerRow[]).length === 0) return null;
  const customer = (rpcRows as CustomerRow[])[0];

  await logActivity({
    restaurantId,
    actionType: "customer.visit",
    entityType: "customer",
    entityId: customerId,
    description: `A enregistré une visite pour "${customer.name}" (${amountSpent}$, +${pointsEarned} pts)`,
  });

  // Told to the customer, not the staff — the staff-side toast for this
  // same crossing lives in FidelisationView (their own screen, right after
  // this call resolves). Total spent before this visit is derived rather
  // than re-queried, since the RPC already added amountSpent atomically.
  const tierThresholds = {
    tier2: restaurantRow?.loyalty_tier_2_threshold ?? DEFAULT_LOYALTY_TIER_THRESHOLDS.tier2,
    tier3: restaurantRow?.loyalty_tier_3_threshold ?? DEFAULT_LOYALTY_TIER_THRESHOLDS.tier3,
  };
  const tierBefore = getLoyaltyTier(customer.total_spent - amountSpent, tierThresholds);
  const tierAfter = getLoyaltyTier(customer.total_spent, tierThresholds);
  if (tierAfter !== tierBefore && restaurantRow) {
    const tierName = loyaltyTierLabel[tierAfter];
    const firstName = customer.name.trim().split(/\s+/)[0] || customer.name;
    if (customer.email) {
      await sendRetentionEmail({
        to: customer.email,
        subject: `${firstName}, vous passez au palier ${tierName} chez ${restaurantRow.name} !`,
        bodyHtml: `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">Félicitations ${firstName} ! Vous venez de passer au palier <strong>${tierName}</strong> chez ${restaurantRow.name}. Consultez vos points et vos récompenses disponibles.</p>`,
      });
    }
    if (customer.user_id) {
      await sendPushToUsers(
        [customer.user_id],
        { title: `Vous passez au palier ${tierName} !`, body: `${restaurantRow.name} vous récompense pour votre fidélité.`, link: "/portal" },
        restaurantId
      );
    }
  }

  // Visit-count reward ladder (V1→V2→V3) — separate from the spend-tier
  // system above. Edge-detected on this single visit (visitBefore <
  // threshold <= visitAfter) so a customer already past a threshold before
  // the ladder was configured is never retroactively notified.
  if (restaurantRow?.visit_rewards_enabled) {
    const visitBefore = customer.visit_count - 1;
    const visitAfter = customer.visit_count;
    const crossedTiers = (restaurantRow.visit_reward_tiers ?? []).filter(
      (t) => t.active !== false && visitBefore < t.visits && visitAfter >= t.visits
    );
    for (const tier of crossedTiers) {
      const firstName = customer.name.trim().split(/\s+/)[0] || customer.name;
      if (customer.email) {
        await sendRetentionEmail({
          to: customer.email,
          subject: `${firstName}, vous avez débloqué « ${tier.reward} » chez ${restaurantRow.name} !`,
          bodyHtml: `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">Bravo ${firstName} ! Avec cette ${visitAfter}e visite chez ${restaurantRow.name}, vous débloquez <strong>${tier.reward}</strong>. Passez nous voir pour en profiter !</p>`,
        });
      }
      await logActivity({
        restaurantId,
        actionType: "customer.visit_reward",
        entityType: "customer",
        entityId: customerId,
        description: `Récompense automatique débloquée pour "${customer.name}" — ${tier.reward} (${tier.label})`,
      });
    }
  }

  const { data: txData } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return mapCustomer(customer, ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction));
}

/**
 * Redeems a reward for a customer, deducting points and logging the ledger
 * entry atomically (see increment_customer_visit comment — same pattern).
 * Returns null if the reward doesn't exist or the balance is insufficient
 * at the moment of the write (checked in the same SQL statement as the
 * deduction, so two concurrent redemptions can't both succeed off a stale
 * balance read).
 */
export async function redeemReward(
  restaurantId: string,
  customerId: string,
  rewardId: string
): Promise<Customer | null> {
  const supabase = await createClient();

  const { data: rpcRows, error: rpcError } = await supabase.rpc("redeem_customer_reward", {
    p_customer_id: customerId,
    p_restaurant_id: restaurantId,
    p_reward_id: rewardId,
  });

  if (rpcError || !rpcRows || (rpcRows as CustomerRow[]).length === 0) return null;
  const customer = (rpcRows as CustomerRow[])[0];

  const { data: rewardRow } = await supabase
    .from("loyalty_rewards")
    .select("name, points_cost")
    .eq("id", rewardId)
    .maybeSingle();
  const reward = rewardRow as { name: string; points_cost: number } | null;

  await logActivity({
    restaurantId,
    actionType: "customer.redeem",
    entityType: "customer",
    entityId: customerId,
    description: `A échangé "${reward?.name ?? "une récompense"}" pour "${customer.name}"${reward ? ` (-${reward.points_cost} pts)` : ""}`,
  });

  const { data: txData } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return mapCustomer(customer, ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction));
}

type LoyaltyRewardRow = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  active: boolean;
  created_at: string;
  menu_item_id: string | null;
};

export function mapReward(row: LoyaltyRewardRow): LoyaltyReward {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    pointsCost: row.points_cost,
    active: row.active,
    createdAt: row.created_at,
    menuItemId: row.menu_item_id,
  };
}

export async function getLoyaltyRewards(restaurantId: string): Promise<LoyaltyReward[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("points_cost");

  if (error || !data) return [];
  return (data as LoyaltyRewardRow[]).map(mapReward);
}

export async function createLoyaltyReward(
  restaurantId: string,
  input: { name: string; description?: string; pointsCost: number; menuItemId?: string | null }
): Promise<LoyaltyReward | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      description: input.description || null,
      points_cost: input.pointsCost,
      menu_item_id: input.menuItemId || null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapReward(data as LoyaltyRewardRow);
}

export async function deleteLoyaltyReward(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("loyalty_rewards")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);
  return !error;
}

type RewardRedemptionRpcRow = {
  id: string;
  reward_name: string;
  points_spent: number;
  customer_name: string;
  claimed_at: string;
};

/**
 * Staff validates a code the customer is showing in person (from their
 * self-serve redemption in /portal). The RPC itself enforces staff
 * membership and atomically flips pending -> claimed, so a double-tap on
 * an already-claimed code fails cleanly instead of "claiming" it twice.
 */
export async function claimRewardRedemption(
  restaurantId: string,
  code: string
): Promise<{ rewardName: string; pointsSpent: number; customerName: string; claimedAt: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_claim_reward_redemption", {
    p_restaurant_id: restaurantId,
    p_code: code.trim(),
  });

  if (error || !data || (data as RewardRedemptionRpcRow[]).length === 0) return null;
  const row = (data as RewardRedemptionRpcRow[])[0];
  return {
    rewardName: row.reward_name,
    pointsSpent: row.points_spent,
    customerName: row.customer_name,
    claimedAt: row.claimed_at,
  };
}
