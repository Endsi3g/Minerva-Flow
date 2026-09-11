/**
 * A restaurant's subscription tier — the single source of truth for what's
 * gated, per the /grill-me decision to use a runtime flag on one codebase
 * rather than a diverging git branch per plan:
 * - 'essentiel' (Profit Core — $150/mo): food cost calculation, POS sync, menu engineering.
 * - 'croissance' (Growth & Loyalty — $290/mo, star plan): loyalty program, retention engine, Flow AI.
 * - 'marque_blanche' (Enterprise / Multi-sites — $590+/mo): multi-location & franchise management.
 */
export type PlanTier = "essentiel" | "croissance" | "marque_blanche";

const PLAN_TIER_ORDER: PlanTier[] = ["essentiel", "croissance", "marque_blanche"];

export function planTierAtLeast(tier: PlanTier, minimum: PlanTier): boolean {
  return PLAN_TIER_ORDER.indexOf(tier) >= PLAN_TIER_ORDER.indexOf(minimum);
}
