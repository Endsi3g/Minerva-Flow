/**
 * A restaurant's subscription tier — the single source of truth for what's
 * gated, per the /grill-me decision to use a runtime flag on one codebase
 * rather than a diverging git branch per plan. 'essentiel' ($99/mo) is the
 * default every restaurant gets; 'croissance' ($250/mo) and
 * 'marque_blanche' ($500/mo, white-label) unlock more as they're wired up.
 */
export type PlanTier = "essentiel" | "croissance" | "marque_blanche";

const PLAN_TIER_ORDER: PlanTier[] = ["essentiel", "croissance", "marque_blanche"];

export function planTierAtLeast(tier: PlanTier, minimum: PlanTier): boolean {
  return PLAN_TIER_ORDER.indexOf(tier) >= PLAN_TIER_ORDER.indexOf(minimum);
}
