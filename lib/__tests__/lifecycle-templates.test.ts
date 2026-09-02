import { describe, it, expect } from "vitest";
import {
  renderLifecycleEmail,
  type LifecycleStep,
} from "@/lib/email/lifecycle-templates";

describe("Lifecycle Email Templates", () => {
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
    it(`renders step '${step}' with all required properties and CASL mentions`, () => {
      const result = renderLifecycleEmail(step, params);

      expect(result.subject).toBeDefined();
      expect(result.subject.length).toBeGreaterThan(5);

      expect(result.preheader).toBeDefined();
      expect(result.preheader.length).toBeGreaterThan(5);

      expect(result.html).toContain("https://minervaflow.app/icon-192.png");
      expect(result.html).toContain("Minerva Flow");
      expect(result.html).toContain("Montréal (Québec), Canada");
      expect(result.html).toContain("Alexandre");

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(20);
    });
  });
});
