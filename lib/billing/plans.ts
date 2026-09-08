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

const ESSENTIEL_MONTHLY = 99;
const CROISSANCE_MONTHLY = 250;
// Marque blanche is a contact-sales tier (see isSelfServeTier below) — this
// price is shown on the pricing table for reference but checkout always
// routes to a sales conversation, per the /grill-me decision: white-label
// setup (branding, domain, custom onboarding) isn't a self-serve flow.
const MARQUE_BLANCHE_MONTHLY = 500;

export const PLAN_ESTABLISHMENT_LIMITS: Record<PlanTier, number | null> = {
  essentiel: 1,
  croissance: null,
  marque_blanche: null,
};

export const PLANS: Record<PlanTier, PlanDefinition> = {
  essentiel: {
    tier: "essentiel",
    name: PLAN_NAMES.essentiel,
    description: "Pour un premier établissement qui digitalise sa fidélisation.",
    monthlyPriceCad: ESSENTIEL_MONTHLY,
    yearlyPriceCad: yearlyFromMonthly(ESSENTIEL_MONTHLY),
    establishmentLimit: PLAN_ESTABLISHMENT_LIMITS.essentiel,
    monthlyTokenQuota: PLAN_AI_QUOTAS.essentiel,
    support: "Support par email",
    features: [
      "1 établissement",
      "Programme de fidélité complet (paliers, récompenses, offres, parrainage)",
      "QR par restaurant, commande directe 0% commission",
      "Widgets iOS (accueil et écran verrouillé)",
      "Flow AI — 50 crédits/mois",
      "Support par email",
    ],
  },
  croissance: {
    tier: "croissance",
    name: PLAN_NAMES.croissance,
    description: "Pour les groupes multi-établissements qui veulent tout centraliser.",
    monthlyPriceCad: CROISSANCE_MONTHLY,
    yearlyPriceCad: yearlyFromMonthly(CROISSANCE_MONTHLY),
    establishmentLimit: PLAN_ESTABLISHMENT_LIMITS.croissance,
    monthlyTokenQuota: PLAN_AI_QUOTAS.croissance,
    support: "Support prioritaire",
    highlight: true,
    badge: "Le plus populaire",
    features: [
      "Établissements illimités",
      "Tout Essentiel, plus :",
      "Réservations, inventaire, horaire et finance",
      "Rapports & analytics avancés",
      "Découverte multi-établissements (même franchise)",
      "Flow AI — 500k tokens/mois",
      "Support prioritaire",
    ],
  },
  marque_blanche: {
    tier: "marque_blanche",
    name: PLAN_NAMES.marque_blanche,
    description: "Application en marque blanche pour chaînes et groupes — vente accompagnée.",
    monthlyPriceCad: MARQUE_BLANCHE_MONTHLY,
    yearlyPriceCad: yearlyFromMonthly(MARQUE_BLANCHE_MONTHLY),
    establishmentLimit: PLAN_ESTABLISHMENT_LIMITS.marque_blanche,
    monthlyTokenQuota: PLAN_AI_QUOTAS.marque_blanche,
    support: "Account manager dédié",
    features: [
      "Établissements illimités",
      "Tout Croissance, plus :",
      "Image de marque personnalisée (app, couleurs, nom)",
      "Carte ouverte multi-enseignes (découverte façon Google Maps)",
      "Intégrations personnalisées",
      "Flow AI — quota sur mesure",
      "SLA garanti & facturation consolidée",
      "Account manager dédié",
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
