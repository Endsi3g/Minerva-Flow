// Canonical tier type lives in lib/plan-tier.ts (also used for per-restaurant
// feature gating) — re-exported here so billing code has one PlanTier, not
// two concepts with the same literal values.
import type { PlanTier } from "@/lib/plan-tier";
export type { PlanTier };

export const PLAN_AI_QUOTAS: Record<PlanTier, number> = {
  essentiel: 100_000,
  croissance: 500_000,
  marque_blanche: 2_000_000,
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  essentiel: "Profit Core",
  croissance: "Growth & Loyalty",
  marque_blanche: "Enterprise / Multi-sites",
};

export function calculateQuotaUsage(tokensUsed: number, quota: number) {
  const safeQuota = Math.max(1, quota);
  const percentUsed = Math.min(100, Math.round((tokensUsed / safeQuota) * 100));
  return {
    percentUsed,
    isExceeded: tokensUsed >= safeQuota,
  };
}
