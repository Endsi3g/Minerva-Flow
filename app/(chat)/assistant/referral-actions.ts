"use server";

import { getOrCreateReferralCode, getReferrals, getRewardSummary } from "@/lib/data/referrals";
import type { Referral } from "@/lib/types";

export async function getReferralModalDataAction(restaurantId: string) {
  const [code, summary] = await Promise.all([
    getOrCreateReferralCode(restaurantId),
    getRewardSummary(restaurantId),
  ]);

  return {
    code: code?.code ?? null,
    pendingCount: summary.pendingCount,
    activeCount: summary.activeCount,
    totalDiscountApplied: summary.totalDiscountApplied,
  };
}

export async function getReferralsListAction(restaurantId: string): Promise<Referral[]> {
  return getReferrals(restaurantId);
}
