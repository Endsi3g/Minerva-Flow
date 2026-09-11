import { describe, it, expect } from "vitest";
import { PLANS, isSelfServeTier, ANNUAL_DISCOUNT_RATE } from "@/lib/billing/plans";
import { PLAN_NAMES, PLAN_AI_QUOTAS } from "@/lib/ai/quotas";

describe("Pricing Catalog & Product Positioning", () => {
  it("should configure Profit Core correctly at 150 $ / month", () => {
    const plan = PLANS.essentiel;
    expect(plan.name).toBe("Profit Core");
    expect(PLAN_NAMES.essentiel).toBe("Profit Core");
    expect(plan.description).toBe("Pour comprendre et protéger vos marges");
    expect(plan.monthlyPriceCad).toBe(150);
    expect(plan.yearlyPriceCad).toBe(1350); // 150 * 12 * 0.75
    expect(plan.establishmentLimit).toBe(1);
    expect(plan.features).toContain("Calcul du coût portion");
    expect(plan.features).toContain("Synchronisation d’une caisse");
    expect(plan.features).toContain("Diagnostic du menu");
    expect(plan.features).toContain("QR code de capture de contacts");
    expect(plan.features).toContain("Rapport hebdomadaire");
    expect(plan.features).toContain("Onboarding guidé");
    expect(isSelfServeTier("essentiel")).toBe(true);
  });

  it("should configure Growth & Loyalty as the star plan at 290 $ / month", () => {
    const plan = PLANS.croissance;
    expect(plan.name).toBe("Growth & Loyalty");
    expect(PLAN_NAMES.croissance).toBe("Growth & Loyalty");
    expect(plan.description).toBe("Pour augmenter les visites répétées");
    expect(plan.monthlyPriceCad).toBe(290);
    expect(plan.yearlyPriceCad).toBe(2610); // 290 * 12 * 0.75
    expect(plan.highlight).toBe(true);
    expect(plan.badge).toContain("Plan vedette");
    expect(plan.features).toContain("Tout ce qui est inclus dans Profit Core");
    expect(plan.features).toContain("Programme de fidélité");
    expect(plan.features).toContain("Récompenses automatiques");
    expect(plan.features).toContain("Segments clients");
    expect(plan.features).toContain("Campagnes SMS et courriel");
    expect(plan.features).toContain("Réactivation des clients inactifs");
    expect(plan.features).toContain("Parrainage");
    expect(plan.features).toContain("Rapports de revenus fidélisés");
    expect(plan.features).toContain("Recommandations de Flow AI");
    expect(isSelfServeTier("croissance")).toBe(true);
  });

  it("should configure Enterprise / Multi-sites starting from 590 $ / month", () => {
    const plan = PLANS.marque_blanche;
    expect(plan.name).toBe("Enterprise / Multi-sites");
    expect(PLAN_NAMES.marque_blanche).toBe("Enterprise / Multi-sites");
    expect(plan.description).toBe("Pour gérer plusieurs établissements");
    expect(plan.monthlyPriceCad).toBe(590);
    expect(plan.features).toContain("Fidélité interétablissements");
    expect(plan.features).toContain("Base client centralisée");
    expect(plan.features).toContain("Comparaison des performances");
    expect(plan.features).toContain("Multi-caisses");
    expect(plan.features).toContain("Rôles et permissions avancés");
    expect(plan.features).toContain("Exports comptables");
    expect(plan.features).toContain("Accompagnement stratégique");
    expect(isSelfServeTier("marque_blanche")).toBe(false); // contact sales flow
  });

  it("should have a 25% annual discount (3 months free)", () => {
    expect(ANNUAL_DISCOUNT_RATE).toBe(0.25);
  });
});
