import type { LucideIcon } from "lucide-react";
import { Sprout, Star, Crown } from "lucide-react";
import type { BadgeTone, BadgeVariant } from "@/components/ui/Badge";

/**
 * Premium loyalty status — deliberately not "Bronze/Argent/Or": a
 * hospitality-flavoured progression (regular → insider → advocate) that
 * also sets up the top tier as a natural on-ramp into the referral program
 * ("devenez Ambassadeur"), rather than an arbitrary metal ranking.
 */
export type LoyaltyTier = "habitue" | "privilegie" | "ambassadeur";

export const loyaltyTierOrder: LoyaltyTier[] = ["habitue", "privilegie", "ambassadeur"];

export const loyaltyTierLabel: Record<LoyaltyTier, string> = {
  habitue: "Habitué",
  privilegie: "Privilégié",
  ambassadeur: "Ambassadeur",
};

export const loyaltyTierDescription: Record<LoyaltyTier, string> = {
  habitue: "Vient de rejoindre le programme.",
  privilegie: "Client régulier — dépense cumulée notable.",
  ambassadeur: "Votre client le plus fidèle — le candidat naturel pour parrainer.",
};

/** Badge tone follows the design system's own rule: lime is reserved for "badges clés" — the top tier. */
export const loyaltyTierBadge: Record<LoyaltyTier, { tone: BadgeTone; variant: BadgeVariant; icon: LucideIcon }> = {
  habitue: { tone: "neutral", variant: "outline", icon: Sprout },
  privilegie: { tone: "green", variant: "subtle", icon: Star },
  ambassadeur: { tone: "lime", variant: "solid", icon: Crown },
};

export type LoyaltyTierThresholds = { tier2: number; tier3: number };

export const DEFAULT_LOYALTY_TIER_THRESHOLDS: LoyaltyTierThresholds = { tier2: 150, tier3: 400 };

export function getLoyaltyTier(
  totalSpent: number,
  thresholds: LoyaltyTierThresholds = DEFAULT_LOYALTY_TIER_THRESHOLDS
): LoyaltyTier {
  if (totalSpent >= thresholds.tier3) return "ambassadeur";
  if (totalSpent >= thresholds.tier2) return "privilegie";
  return "habitue";
}

/**
 * A flat points-per-dollar rate already rewards a $40 visit twice as much
 * as a $20 one — but it doesn't nudge someone who's already at the counter
 * toward spending more on THIS visit. This bonus multiplier does: bigger
 * single-visit tickets earn a better rate, on top of the base rate.
 */
const VISIT_BONUS_TIERS: { minAmount: number; multiplier: number }[] = [
  { minAmount: 50, multiplier: 1.5 },
  { minAmount: 20, multiplier: 1.25 },
  { minAmount: 0, multiplier: 1 },
];

export function getVisitBonusMultiplier(amountSpent: number): number {
  return (VISIT_BONUS_TIERS.find((tier) => amountSpent >= tier.minAmount) ?? VISIT_BONUS_TIERS[VISIT_BONUS_TIERS.length - 1])
    .multiplier;
}
