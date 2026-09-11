import { PLAN_AI_QUOTAS, PLAN_NAMES, type PlanTier } from "@/lib/ai/quotas";

export type BillingInterval = "monthly" | "yearly";

/**
 * Canonical plan catalog — single source of truth for pricing, quotas,
 * establishment limits and feature copy shown across the pricing table,
 * the billing dashboard, and the establishment-limit upsell paths.
 *
 * Prices (99/250/500 CAD monthly) are confirmed final. They still run
 * through Stripe TEST-MODE price IDs (see scripts/create-stripe-billing-catalog.ts)
 * until the switch to live keys — that's a separate operational step, not
 * a pricing question.
 */
export type SelfServePlanTier = Extract<PlanTier, "essentiel" | "croissance">;

export type PlanDefinition = {
  tier: PlanTier;
  name: string;
  description: string;
  monthlyPriceCad: number | null; // null => contact sales, price not yet set
  yearlyPriceCad: number | null;
  establishmentLimit: number | null; // null => unlimited
  monthlyTokenQuota: number;
  support: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
};

// 25% off the annual price vs. paying monthly (3 months free) — within the
// 20-25% range agreed for the annual discount.
export const ANNUAL_DISCOUNT_RATE = 0.25;

function yearlyFromMonthly(monthlyPriceCad: number): number {
  return Math.round(monthlyPriceCad * 12 * (1 - ANNUAL_DISCOUNT_RATE));
}

const ESSENTIEL_MONTHLY = 150;
const CROISSANCE_MONTHLY = 290;
// Enterprise / Multi-sites is a sales-assisted tier with pricing starting from 590 CAD / month
const MARQUE_BLANCHE_MONTHLY = 590;

export const PLAN_ESTABLISHMENT_LIMITS: Record<PlanTier, number | null> = {
  essentiel: 1,
  croissance: null,
  marque_blanche: null,
};

export const PLANS: Record<PlanTier, PlanDefinition> = {
  essentiel: {
    tier: "essentiel",
    name: PLAN_NAMES.essentiel,
    description: "Pour comprendre et protéger vos marges",
    monthlyPriceCad: ESSENTIEL_MONTHLY,
    yearlyPriceCad: yearlyFromMonthly(ESSENTIEL_MONTHLY),
    establishmentLimit: PLAN_ESTABLISHMENT_LIMITS.essentiel,
    monthlyTokenQuota: PLAN_AI_QUOTAS.essentiel,
    support: "Support par email & onboarding guidé",
    features: [
      "Calcul du coût portion",
      "Synchronisation d’une caisse",
      "Diagnostic du menu",
      "QR code de capture de contacts",
      "Rapport hebdomadaire",
      "Onboarding guidé",
    ],
  },
  croissance: {
    tier: "croissance",
    name: PLAN_NAMES.croissance,
    description: "Pour augmenter les visites répétées",
    monthlyPriceCad: CROISSANCE_MONTHLY,
    yearlyPriceCad: yearlyFromMonthly(CROISSANCE_MONTHLY),
    establishmentLimit: PLAN_ESTABLISHMENT_LIMITS.croissance,
    monthlyTokenQuota: PLAN_AI_QUOTAS.croissance,
    support: "Support prioritaire 7j/7",
    highlight: true,
    badge: "Plan vedette — Le plus populaire",
    features: [
      "Tout ce qui est inclus dans Profit Core",
      "Programme de fidélité",
      "Récompenses automatiques",
      "Segments clients",
      "Campagnes SMS et courriel",
      "Réactivation des clients inactifs",
      "Parrainage",
      "Rapports de revenus fidélisés",
      "Recommandations de Flow AI",
    ],
  },
  marque_blanche: {
    tier: "marque_blanche",
    name: PLAN_NAMES.marque_blanche,
    description: "Pour gérer plusieurs établissements",
    monthlyPriceCad: MARQUE_BLANCHE_MONTHLY,
    yearlyPriceCad: yearlyFromMonthly(MARQUE_BLANCHE_MONTHLY),
    establishmentLimit: PLAN_ESTABLISHMENT_LIMITS.marque_blanche,
    monthlyTokenQuota: PLAN_AI_QUOTAS.marque_blanche,
    support: "Accompagnement stratégique dédié",
    badge: "Multi-établissements",
    features: [
      "Fidélité interétablissements",
      "Base client centralisée",
      "Comparaison des performances",
      "Multi-caisses",
      "Rôles et permissions avancés",
      "Exports comptables",
      "Accompagnement stratégique",
    ],
  },
};

export const SELF_SERVE_TIERS: SelfServePlanTier[] = ["essentiel", "croissance"];

export function isSelfServeTier(tier: string): tier is SelfServePlanTier {
  return tier === "essentiel" || tier === "croissance";
}

export function establishmentLimitFor(tier: PlanTier): number | null {
  return PLAN_ESTABLISHMENT_LIMITS[tier];
}
