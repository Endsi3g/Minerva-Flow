import type { PlanTier } from "@/lib/ai/quotas";
import { establishmentLimitFor } from "@/lib/billing/plans";

export type EstablishmentLimitCheck = {
  allowed: boolean;
  limit: number | null;
  count: number;
  tier: PlanTier;
};

export function checkEstablishmentLimit(tier: PlanTier, currentCount: number): EstablishmentLimitCheck {
  const limit = establishmentLimitFor(tier);
  return {
    allowed: limit === null || currentCount < limit,
    limit,
    count: currentCount,
    tier,
  };
}
