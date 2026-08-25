import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateEnrichedProspectAudit } from "@/lib/prospects/audit/ai-audit";

describe("generateEnrichedProspectAudit", () => {
  it("computes monthly commission loss correctly", async () => {
    const enriched = await generateEnrichedProspectAudit({
      restaurantName: "Test Bistro",
      websiteUrl: "https://example.com",
      commissionRatePct: 30,
      assumedMonthlyOrders: 500,
    });

    expect(enriched.monthlyCommissionLossCents).toBeGreaterThan(0);
    expect(enriched.monthlyCommissionLoss).toContain("$");
    expect(enriched.keyFindings.strengths).toBeDefined();
    expect(enriched.keyFindings.weaknesses).toBeDefined();
    expect(enriched.keyFindings.opportunities).toBeDefined();
    expect(enriched.customPitchEmailDraft.subject).toContain("Test Bistro");
    expect(enriched.customPitchEmailDraft.body).toContain(enriched.monthlyCommissionLoss);
  });
});
