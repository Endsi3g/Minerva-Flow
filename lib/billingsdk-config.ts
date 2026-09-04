import { PLANS as MINERVA_PLANS } from "@/lib/billing/plans";

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
export const plans: Plan[] = (["starter", "pro", "enterprise"] as const).map((tier) => {
  const plan = MINERVA_PLANS[tier];
  const isContactSales = plan.monthlyPriceCad == null;
  return {
    id: plan.tier,
    title: plan.name,
    description: plan.description,
    highlight: plan.highlight,
    badge: plan.badge,
    currency: "$",
    monthlyPrice: isContactSales ? "Sur devis" : String(plan.monthlyPriceCad),
    yearlyPrice: isContactSales ? "Sur devis" : String(plan.yearlyPriceCad),
    buttonText: isContactSales ? "Contacter les ventes" : `Choisir ${plan.name}`,
    features: plan.features.map((name) => ({ name, icon: "check", iconColor: "text-mv-green-dark" })),
  };
});
