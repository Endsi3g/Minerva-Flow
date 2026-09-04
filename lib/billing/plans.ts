import { PLAN_AI_QUOTAS, PLAN_NAMES, type PlanTier } from "@/lib/ai/quotas";

export type BillingInterval = "monthly" | "yearly";

/**
 * Canonical plan catalog — single source of truth for pricing, quotas,
 * establishment limits and feature copy shown across the pricing table,
 * the billing dashboard, and the establishment-limit upsell paths.
 *
 * Prices are TEST-MODE placeholders (see scripts/create-stripe-billing-catalog.ts)
 * pending final sign-off between the cofounders per the pricing governance rule —
 * do not treat these as final before that consensus and a switch to live keys.
 */
export type SelfServePlanTier = Extract<PlanTier, "starter" | "pro">;

export type PlanDefinition = {
  tier: PlanTier;
  name: string;
  description: string;
  monthlyPriceCad: number | null; // null => contact sales (enterprise)
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

const STARTER_MONTHLY = 149;
const PRO_MONTHLY = 299;

export const PLAN_ESTABLISHMENT_LIMITS: Record<PlanTier, number | null> = {
  starter: 1,
  pro: null,
  enterprise: null,
};

export const PLANS: Record<PlanTier, PlanDefinition> = {
  starter: {
    tier: "starter",
    name: PLAN_NAMES.starter,
    description: "Pour un premier établissement qui digitalise son opération.",
    monthlyPriceCad: STARTER_MONTHLY,
    yearlyPriceCad: yearlyFromMonthly(STARTER_MONTHLY),
    establishmentLimit: PLAN_ESTABLISHMENT_LIMITS.starter,
    monthlyTokenQuota: PLAN_AI_QUOTAS.starter,
    support: "Support par email",
    features: [
      "1 établissement",
      "Finance, inventaire et ingénierie de menu",
      "Commande directe 0% commission",
      "Flow AI — 100k tokens/mois",
      "Support par email",
    ],
  },
  pro: {
    tier: "pro",
    name: PLAN_NAMES.pro,
    description: "Pour les groupes multi-établissements qui veulent tout centraliser.",
    monthlyPriceCad: PRO_MONTHLY,
    yearlyPriceCad: yearlyFromMonthly(PRO_MONTHLY),
    establishmentLimit: PLAN_ESTABLISHMENT_LIMITS.pro,
    monthlyTokenQuota: PLAN_AI_QUOTAS.pro,
    support: "Support prioritaire",
    highlight: true,
    badge: "Le plus populaire",
    features: [
      "Établissements illimités",
      "Tout Starter, plus :",
      "Fidélisation avancée",
      "Rapports & analytics avancés",
      "Flow AI — 500k tokens/mois",
      "Support prioritaire",
    ],
  },
  enterprise: {
    tier: "enterprise",
    name: PLAN_NAMES.enterprise,
    description: "Chaînes et groupes avec des besoins sur mesure — porté par notre offre Agence.",
    monthlyPriceCad: null,
    yearlyPriceCad: null,
    establishmentLimit: PLAN_ESTABLISHMENT_LIMITS.enterprise,
    monthlyTokenQuota: PLAN_AI_QUOTAS.enterprise,
    support: "Account manager dédié",
    features: [
      "Établissements illimités",
      "Tout Pro, plus :",
      "Intégrations personnalisées",
      "Flow AI — quota sur mesure",
      "SLA garanti & facturation consolidée",
      "Account manager dédié",
    ],
  },
};

export const SELF_SERVE_TIERS: SelfServePlanTier[] = ["starter", "pro"];

export function isSelfServeTier(tier: string): tier is SelfServePlanTier {
  return tier === "starter" || tier === "pro";
}

export function establishmentLimitFor(tier: PlanTier): number | null {
  return PLAN_ESTABLISHMENT_LIMITS[tier];
}
