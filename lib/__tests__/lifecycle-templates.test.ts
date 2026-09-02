import { describe, it, expect } from "vitest";
import {
  renderLifecycleEmail,
  renderWeeklyReportEmail,
  renderSpecialOfferEmail,
  renderLoyaltyRetentionEmail,
  type LifecycleStep,
} from "@/lib/email/lifecycle-templates";

describe("Lifecycle & Operational Email Templates", () => {
  const steps: LifecycleStep[] = [
    "welcome",
    "activation",
    "feature_highlight",
    "support_checkin",
    "case_study",
    "conversion",
    "reactivation",
  ];

  const params = {
    firstName: "Alexandre",
    restaurantName: "Bistro Minerva",
    appUrl: "https://minervaflow.app",
    hasRestaurant: true,
    hasServiceDays: false,
    hasPosConnected: false,
  };

  steps.forEach((step) => {
    it(`renders lifecycle step '${step}' with all required properties and CASL mentions`, () => {
      const result = renderLifecycleEmail(step, params);

      expect(result.subject).toBeDefined();
      expect(result.subject.length).toBeGreaterThan(5);

      expect(result.preheader).toBeDefined();
      expect(result.preheader.length).toBeGreaterThan(5);

      expect(result.html).toContain("https://minervaflow.app/icon-192.png");
      expect(result.html).toContain("Minerva Flow");
      expect(result.html).toContain("Montréal (Québec), Canada");
      expect(result.html).toContain("Alexandre");

      // Verify no lime color is present in output
      expect(result.html.toLowerCase()).not.toContain("#dfff5f");

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(20);
    });
  });

  it("renders weekly report email with kpis and without lime", () => {
    const result = renderWeeklyReportEmail({
      firstName: "Alexandre",
      restaurantName: "Bistro Minerva",
      totalSales: "14 820 $",
      primeCostRatio: "58,4 %",
      appUrl: "https://minervaflow.app",
    });

    expect(result.subject).toContain("Bistro Minerva");
    expect(result.html).toContain("14 820 $");
    expect(result.html).toContain("58,4 %");
    expect(result.html).toContain("https://minervaflow.app/icon-192.png");
    expect(result.html.toLowerCase()).not.toContain("#dfff5f");
  });

  it("renders special offer email with transparent features", () => {
    const result = renderSpecialOfferEmail({
      firstName: "Alexandre",
      restaurantName: "Bistro Minerva",
      discountSummary: "2 mois offerts",
      appUrl: "https://minervaflow.app",
    });

    expect(result.subject).toContain("2 mois offerts");
    expect(result.html).toContain("Connexions de caisse illimitées");
    expect(result.html.toLowerCase()).not.toContain("#dfff5f");
  });

  it("renders rich loyalty retention email with points and tiers", () => {
    const result = renderLoyaltyRetentionEmail({
      customerName: "Camille",
      restaurantName: "Café Lucide",
      pointsBalance: 85,
      tierName: "Habitué",
      rewardTitle: "Café de spécialité offert",
      retentionMessage: "Nous avons hâte de vous revoir !",
      portalUrl: "https://minervaflow.app/portal",
    });

    expect(result.subject).toContain("Café Lucide");
    expect(result.html).toContain("85 points");
    expect(result.html).toContain("Café de spécialité offert");
    expect(result.html).toContain("Habitué");
    expect(result.html).toContain("Privilégié");
    expect(result.html.toLowerCase()).not.toContain("#dfff5f");
  });
});
