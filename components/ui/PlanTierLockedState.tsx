import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import type { PlanTier } from "@/lib/plan-tier";

const TIER_LABEL: Record<PlanTier, string> = {
  essentiel: "Essentiel",
  croissance: "Croissance",
  marque_blanche: "Marque blanche",
};

/**
 * Shown in place of a Croissance/Marque blanche feature when the current
 * restaurant is on a lower plan_tier — kept visible (not hidden from nav)
 * so it doubles as an in-app upsell, per the pricing-tier pivot.
 */
export function PlanTierLockedState({
  minimumTier,
  featureName,
  description,
  size = "lg",
}: {
  minimumTier: PlanTier;
  featureName: string;
  description?: string;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <EmptyState
      icon={Lock}
      variant="card"
      size={size}
      title={`${featureName} — disponible avec ${TIER_LABEL[minimumTier]}`}
      description={
        description ??
        `Cette fonctionnalité fait partie du forfait ${TIER_LABEL[minimumTier]} et n'est pas incluse dans votre forfait actuel.`
      }
      action={
        <Button size="sm" nativeButton={false} render={<Link href="/billing" />}>
          Voir les forfaits
        </Button>
      }
    />
  );
}
