import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { Customer, LoyaltyReward, LoyaltyTransaction, LoyaltyTransactionType } from "@/lib/types";

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

export type CustomerInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("loyalty_points_per_dollar")
    .eq("id", restaurantId)
    .maybeSingle();

  const rate = (restaurant as { loyalty_points_per_dollar: number } | null)?.loyalty_points_per_dollar ?? 1;
  const pointsEarned = Math.round(amountSpent * rate);

  const { data: customerRow, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", customerId)
    .maybeSingle();

  if (customerError || !customerRow) return null;
  const customer = customerRow as CustomerRow;

  const { error: txError } = await supabase.from("loyalty_transactions").insert({
    restaurant_id: restaurantId,
    customer_id: customerId,
    type: "visite",
    amount_spent: amountSpent,
    points_delta: pointsEarned,
    note: note ?? null,
    created_by: user?.id ?? null,
  });

  if (txError) return null;

  const { data: updated, error: updateError } = await supabase
    .from("customers")
    .update({
      visit_count: customer.visit_count + 1,
      total_spent: customer.total_spent + amountSpent,
      loyalty_points: customer.loyalty_points + pointsEarned,
      last_visit_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .select("*")
    .single();

  if (updateError || !updated) return null;

  await logActivity({
    restaurantId,
    actionType: "customer.visit",
    entityType: "customer",
    entityId: customerId,
    description: `A enregistré une visite pour "${customer.name}" (${amountSpent}$, +${pointsEarned} pts)`,
  });

  const { data: txData } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return mapCustomer(updated as CustomerRow, ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction));
}

/** Redeems a reward for a customer, deducting points and logging the ledger entry. Fails if the balance is insufficient. */
export async function redeemReward(
  restaurantId: string,
  customerId: string,
  rewardId: string
): Promise<Customer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: customerRow }, { data: rewardRow }] = await Promise.all([
    supabase.from("customers").select("*").eq("restaurant_id", restaurantId).eq("id", customerId).maybeSingle(),
    supabase.from("loyalty_rewards").select("*").eq("restaurant_id", restaurantId).eq("id", rewardId).maybeSingle(),
  ]);

  const customer = customerRow as CustomerRow | null;
  const reward = rewardRow as { id: string; name: string; points_cost: number } | null;
  if (!customer || !reward || customer.loyalty_points < reward.points_cost) return null;

  const { error: txError } = await supabase.from("loyalty_transactions").insert({
    restaurant_id: restaurantId,
    customer_id: customerId,
    type: "echange",
    points_delta: -reward.points_cost,
    note: `Échange : ${reward.name}`,
    created_by: user?.id ?? null,
  });

  if (txError) return null;

  const { data: updated, error: updateError } = await supabase
    .from("customers")
    .update({ loyalty_points: customer.loyalty_points - reward.points_cost })
    .eq("id", customerId)
    .select("*")
    .single();

  if (updateError || !updated) return null;

  await logActivity({
    restaurantId,
    actionType: "customer.redeem",
    entityType: "customer",
    entityId: customerId,
    description: `A échangé "${reward.name}" pour "${customer.name}" (-${reward.points_cost} pts)`,
  });

  const { data: txData } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  return mapCustomer(updated as CustomerRow, ((txData as LoyaltyTransactionRow[]) ?? []).map(mapTransaction));
}

type LoyaltyRewardRow = {
  id: string;
  restaurant_id: string;
  name: string;
  points_cost: number;
  active: boolean;
  created_at: string;
};

function mapReward(row: LoyaltyRewardRow): LoyaltyReward {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    pointsCost: row.points_cost,
    active: row.active,
    createdAt: row.created_at,
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
  input: { name: string; pointsCost: number }
): Promise<LoyaltyReward | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .insert({ restaurant_id: restaurantId, name: input.name, points_cost: input.pointsCost })
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
