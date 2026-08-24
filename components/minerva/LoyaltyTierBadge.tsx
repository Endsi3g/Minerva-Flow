import { Badge } from "@/components/ui/Badge";
import { getLoyaltyTier, loyaltyTierBadge, loyaltyTierLabel, type LoyaltyTierThresholds } from "@/lib/loyalty-tiers";

export function LoyaltyTierBadge({
  totalSpent,
  thresholds,
  size = "default",
}: {
  totalSpent: number;
  thresholds?: LoyaltyTierThresholds;
  size?: "xs" | "sm" | "default" | "lg";
}) {
  const tier = getLoyaltyTier(totalSpent, thresholds);
  const { tone, variant, icon: Icon } = loyaltyTierBadge[tier];
  return (
    <Badge tone={tone} variant={variant} size={size}>
      <Icon size={size === "xs" ? 10 : 12} strokeWidth={2.4} />
      {loyaltyTierLabel[tier]}
    </Badge>
  );
}
