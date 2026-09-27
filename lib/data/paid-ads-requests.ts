import { createClient } from "@/lib/supabase/server";

export type PaidAdsBudgetRange = "under_500" | "500_1500" | "1500_5000" | "over_5000" | "not_sure";
export type PaidAdsRequestStatus = "nouveau" | "contacte" | "ferme";

export type PaidAdsRequest = {
  id: string;
  restaurantId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  monthlyBudgetRange: PaidAdsBudgetRange;
  goals: string;
  status: PaidAdsRequestStatus;
  createdAt: string;
};

type PaidAdsRequestRow = {
  id: string;
  restaurant_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  monthly_budget_range: PaidAdsBudgetRange;
  goals: string;
  status: PaidAdsRequestStatus;
  created_at: string;
};

function mapRow(row: PaidAdsRequestRow): PaidAdsRequest {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    monthlyBudgetRange: row.monthly_budget_range,
    goals: row.goals,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * The most recent request for this restaurant that hasn't been closed yet —
 * used to show "we're on it" instead of the form again, so an owner can't
 * spam duplicate requests while one is already open.
 */
export async function getOpenPaidAdsRequest(restaurantId: string): Promise<PaidAdsRequest | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("paid_ads_requests")
    .select("id, restaurant_id, contact_name, contact_email, contact_phone, monthly_budget_range, goals, status, created_at")
    .eq("restaurant_id", restaurantId)
    .in("status", ["nouveau", "contacte"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapRow(data as PaidAdsRequestRow) : null;
}

export async function createPaidAdsRequest(input: {
  restaurantId: string;
  requestedBy: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  monthlyBudgetRange: PaidAdsBudgetRange;
  goals: string;
}): Promise<PaidAdsRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("paid_ads_requests")
    .insert({
      restaurant_id: input.restaurantId,
      requested_by: input.requestedBy,
      contact_name: input.contactName,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
      monthly_budget_range: input.monthlyBudgetRange,
      goals: input.goals,
    })
    .select("id, restaurant_id, contact_name, contact_email, contact_phone, monthly_budget_range, goals, status, created_at")
    .single();
  if (error || !data) return null;
  return mapRow(data as PaidAdsRequestRow);
}
