import { PLANS as MINERVA_PLANS, isSelfServeTier } from "@/lib/billing/plans";

export interface Plan {
  id: string;
  title: string;
  description: string;
  highlight?: boolean;
  type?: "monthly" | "yearly";
  currency?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  buttonText: string;
  badge?: string;
  features: {
    name: string;
    icon: string;
    iconColor?: string;
  }[];
}

export interface CurrentPlan {
  plan: Plan;
  type: "monthly" | "yearly" | "custom";
  price?: string;
  nextBillingDate: string;
  paymentMethod: string;
  status: "active" | "inactive" | "past_due" | "cancelled";
}

/**
 * Adapts lib/billing/plans.ts (the canonical source of pricing/quota/limit
 * truth, also used server-side for checkout and limit enforcement) into the
 * shape @billingsdk/pricing-table-five expects. Never edit the plan copy or
 * prices here — change lib/billing/plans.ts instead.
 */
export const plans: Plan[] = (["essentiel", "croissance", "marque_blanche"] as const).map((tier) => {
  const plan = MINERVA_PLANS[tier];
  // Contact-sales routing is a per-tier product decision (marque_blanche has
  // a real displayed price but still isn't self-serve), not a null-price
  // check — see isSelfServeTier in lib/billing/plans.ts.
  const isContactSales = !isSelfServeTier(tier);
  return {
    id: plan.tier,
    title: plan.name,
    description: plan.description,
    highlight: plan.highlight,
    badge: plan.badge,
    currency: "$",
    // Marque blanche shows a real indicative price even though it's contact-sales —
    // only a genuinely unset price (null) falls back to "Sur devis".
    monthlyPrice: plan.monthlyPriceCad == null ? "Sur devis" : String(plan.monthlyPriceCad),
    yearlyPrice: plan.yearlyPriceCad == null ? "Sur devis" : String(plan.yearlyPriceCad),
    buttonText: isContactSales ? "Contacter les ventes" : `Choisir ${plan.name}`,
    features: plan.features.map((name) => ({ name, icon: "check", iconColor: "text-mv-green-dark" })),
  };
});
