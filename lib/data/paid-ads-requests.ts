import { createClient } from "@/lib/supabase/server";

export type PaidAdsBudgetRange = "under_500" | "500_1500" | "1500_5000" | "over_5000" | "not_sure";
export type PaidAdsVolumeEstimate = "under_50" | "50_150" | "150_400" | "over_400" | "not_sure";
export type PaidAdsTimeframe = "immediately" | "this_month" | "exploring";
export type PaidAdsRequestStatus = "nouveau" | "contacte" | "ferme";

export type PaidAdsRequest = {
  id: string;
  restaurantId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  monthlyBudgetRange: PaidAdsBudgetRange;
  weeklyVolumeEstimate: PaidAdsVolumeEstimate;
  hasRunPaidAdsBefore: boolean;
  desiredStartTimeframe: PaidAdsTimeframe;
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
  weekly_volume_estimate: PaidAdsVolumeEstimate;
  has_run_paid_ads_before: boolean;
  desired_start_timeframe: PaidAdsTimeframe;
  goals: string;
  status: PaidAdsRequestStatus;
  created_at: string;
};

const SELECT_COLUMNS = "id, restaurant_id, contact_name, contact_email, contact_phone, monthly_budget_range, weekly_volume_estimate, has_run_paid_ads_before, desired_start_timeframe, goals, status, created_at";

function mapRow(row: PaidAdsRequestRow): PaidAdsRequest {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    monthlyBudgetRange: row.monthly_budget_range,
    weeklyVolumeEstimate: row.weekly_volume_estimate,
    hasRunPaidAdsBefore: row.has_run_paid_ads_before,
    desiredStartTimeframe: row.desired_start_timeframe,
    goals: row.goals,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Transparent, adjustable heuristic for the admin queue's default sort —
 * not a scoring "model": higher budget tier, an established weekly volume,
 * and wanting to start sooner all mean the request is more ready/valuable
 * to act on first. Ties fall back to submission order (oldest first) so
 * the queue still behaves like a fair queue, not just a leaderboard.
 */
const BUDGET_WEIGHT: Record<PaidAdsBudgetRange, number> = { over_5000: 4, "1500_5000": 3, "500_1500": 2, under_500: 1, not_sure: 0 };
const VOLUME_WEIGHT: Record<PaidAdsVolumeEstimate, number> = { over_400: 3, "150_400": 2, "50_150": 1, under_50: 0, not_sure: 0 };
const TIMEFRAME_WEIGHT: Record<PaidAdsTimeframe, number> = { immediately: 2, this_month: 1, exploring: 0 };

export function paidAdsPriorityScore(request: Pick<PaidAdsRequest, "monthlyBudgetRange" | "weeklyVolumeEstimate" | "desiredStartTimeframe">): number {
  return BUDGET_WEIGHT[request.monthlyBudgetRange] * 3
    + VOLUME_WEIGHT[request.weeklyVolumeEstimate] * 2
    + TIMEFRAME_WEIGHT[request.desiredStartTimeframe];
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
    .select(SELECT_COLUMNS)
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
  weeklyVolumeEstimate: PaidAdsVolumeEstimate;
  hasRunPaidAdsBefore: boolean;
  desiredStartTimeframe: PaidAdsTimeframe;
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
      weekly_volume_estimate: input.weeklyVolumeEstimate,
      has_run_paid_ads_before: input.hasRunPaidAdsBefore,
      desired_start_timeframe: input.desiredStartTimeframe,
      goals: input.goals,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error || !data) return null;
  return mapRow(data as PaidAdsRequestRow);
}
