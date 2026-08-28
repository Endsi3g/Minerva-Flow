export type PlanTier = "starter" | "pro" | "enterprise";

export const PLAN_AI_QUOTAS: Record<PlanTier, number> = {
  starter: 100_000,
  pro: 500_000,
  enterprise: 2_000_000,
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Entreprise",
};

export function calculateQuotaUsage(tokensUsed: number, quota: number) {
  const safeQuota = Math.max(1, quota);
  const percentUsed = Math.min(100, Math.round((tokensUsed / safeQuota) * 100));
  return {
    percentUsed,
    isExceeded: tokensUsed >= safeQuota,
  };
}
