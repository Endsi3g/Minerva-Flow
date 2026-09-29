import { describe, expect, it } from "vitest";
import { computeRecommendations, type ComputeRecommendationsInput } from "@/lib/engine/recommendations";
import type { Alert, Campaign, MenuItem, Program, ServiceDay } from "@/lib/types";

function alert(overrides: Partial<Alert>): Alert {
  return {
    id: overrides.id ?? "alert-1",
    title: "Test",
    detail: "",
    severity: "info",
    date: "2026-03-09",
    ...overrides,
  };
}

function program(overrides: Partial<Program>): Program {
  return {
    id: overrides.id ?? "program-1",
    name: overrides.name ?? "Programme",
    type: "brunch",
    restaurantId: "restaurant-1",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    revenue: 1000,
    cost: 500,
    status: "actif",
    dailyRevenue: [],
    campaignIds: [],
    consultantNotes: [],
    ...overrides,
  };
}

function baseInput(overrides: Partial<ComputeRecommendationsInput> = {}): ComputeRecommendationsInput {
  return { campaigns: [], programs: [], serviceDays: [], alerts: [], ...overrides };
}

describe("computeRecommendations", () => {
  it("suggests a weekday activation from a revenue-drop alert", () => {
    const recs = computeRecommendations(baseInput({ alerts: [alert({ id: "revenue-drop-x", date: new Date().toISOString().slice(0, 10) })] }));
    const rec = recs.find((r) => r.id === "rec-weak-weekday");
    expect(rec).toBeDefined();
    expect(rec?.evidenceFreshness).toMatchObject({ status: "recent", asOf: new Date().toISOString().slice(0, 10) });
    expect(rec?.confidenceScore).toBeUndefined();
    expect(rec?.impactEstimate).toBeUndefined();
  });

  it("marks old signals and unknown source dates without implying freshness", () => {
    const oldDate = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
    const stale = computeRecommendations(baseInput({ alerts: [alert({ id: "revenue-drop-x", date: oldDate })] }))
      .find((r) => r.id === "rec-weak-weekday");
    expect(stale?.evidenceFreshness).toMatchObject({ status: "stale", asOf: oldDate });

    const unknown = computeRecommendations(baseInput({
      campaigns: [{ id: "c-unknown", name: "Sans date", type: "post", channel: "Instagram", restaurantId: "r1", startDate: "2026-01-01", endDate: "2026-12-31", status: "active", description: "", estimatedRevenue: 50, impact: "faible", visites: 100, timeline: [], notes: [] }],
    })).find((r) => r.id === "rec-campaign-c-unknown");
    expect(unknown?.evidenceFreshness).toMatchObject({ status: "unknown", asOf: null });
  });

  it("flags a menu cost ratio and a missing food cost without projecting a sales gain", () => {
    const menu: MenuItem[] = [
      { id: "item-1", restaurantId: "r1", name: "Plat faible marge", category: "Mains", price: 10, foodCost: 4, unitsSold: 20, active: true, description: null, imageUrl: null, imageUrls: [], isDraft: false, createdAt: "2026-01-01", updatedAt: new Date().toISOString() },
      { id: "item-2", restaurantId: "r1", name: "Coût à vérifier", category: "Mains", price: 12, foodCost: 0, unitsSold: 2, active: true, description: null, imageUrl: null, imageUrls: [], isDraft: false, createdAt: "2026-01-01", updatedAt: new Date().toISOString() },
    ];
    const recs = computeRecommendations(baseInput({ menuItems: menu }));
    expect(recs.find((r) => r.id === "rec-menu-margin-item-1")?.impactKind).toBe("qualitative");
    expect(recs.find((r) => r.id === "rec-menu-costs-missing")?.diagnosis).toContain("coût matière");
  });

  it("suggests reviewing loyalty rewards without applying a reward automatically", () => {
    const recs = computeRecommendations(baseInput({ loyaltyState: { memberCount: 4, activeRewards: [] } }));
    const rec = recs.find((item) => item.id === "rec-loyalty-no-active-rewards");
    expect(rec?.category).toBe("fidelite");
    expect(rec?.suggestedAction).toContain("Vérifier");
    expect(rec?.evidenceFreshness).toMatchObject({ status: "unknown" });
  });

  it("suggests checking an expense category from a spike alert", () => {
    const recs = computeRecommendations(
      baseInput({ alerts: [alert({ id: "expense-spike-x", title: "Pic de dépense — Loyer" })] })
    );
    const rec = recs.find((r) => r.id === "rec-expense-spike");
    expect(rec?.diagnosis).toContain("Loyer");
  });

  it("flags the lowest-margin active program when it's well below the average", () => {
    const programs = [
      program({ id: "good", name: "Bon programme", revenue: 1000, cost: 300 }), // 70% margin
      program({ id: "bad", name: "Mauvais programme", revenue: 1000, cost: 900 }), // 10% margin
    ];
    const recs = computeRecommendations(baseInput({ programs }));
    const rec = recs.find((r) => r.id === "rec-margin-bad");
    expect(rec).toBeDefined();
    expect(rec?.diagnosis).toContain("Mauvais programme");
  });

  it("does not flag programs when margins are all similar", () => {
    const programs = [
      program({ id: "a", revenue: 1000, cost: 500 }),
      program({ id: "b", revenue: 1000, cost: 520 }),
    ];
    const recs = computeRecommendations(baseInput({ programs }));
    expect(recs.some((r) => r.id.startsWith("rec-margin"))).toBe(false);
  });

  it("flags a weak-return active campaign", () => {
    const campaigns: Campaign[] = [
      {
        id: "c1",
        name: "Campagne faible",
        type: "post",
        channel: "Instagram",
        restaurantId: "r1",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        status: "active",
        description: "",
        estimatedRevenue: 50,
        impact: "faible",
        visites: 100, // $0.50/visit — well under the 1.5 threshold
        timeline: [],
        notes: [],
      },
    ];
    const recs = computeRecommendations(baseInput({ campaigns }));
    expect(recs.some((r) => r.id === "rec-campaign-c1")).toBe(true);
  });

  it("suggests extra capacity after repeated rush days", () => {
    const serviceDays: ServiceDay[] = [
      { id: "1", date: "2026-03-01", restaurantId: "r1", revenue: 1000, mainSource: "salle", events: [], notes: "", anomaly: "rush", author: "x" },
      { id: "2", date: "2026-03-02", restaurantId: "r1", revenue: 1000, mainSource: "salle", events: [], notes: "", anomaly: "rush", author: "x" },
    ];
    const recs = computeRecommendations(baseInput({ serviceDays }));
    expect(recs.some((r) => r.id === "rec-rush-capacity")).toBe(true);
  });

  it("returns an empty list when there's nothing to flag", () => {
    expect(computeRecommendations(baseInput())).toEqual([]);
  });

  it("flags labor cost above the target", () => {
    const recs = computeRecommendations(baseInput({ laborCostPct: 34.5 }));
    const rec = recs.find((r) => r.id === "rec-labor-cost-high");
    expect(rec).toBeDefined();
    expect(rec?.diagnosis).toContain("34.5%");
  });

  it("does not flag labor cost at or under the target, or when unknown", () => {
    expect(computeRecommendations(baseInput({ laborCostPct: 30 })).some((r) => r.id === "rec-labor-cost-high")).toBe(
      false
    );
    expect(computeRecommendations(baseInput({ laborCostPct: null })).some((r) => r.id === "rec-labor-cost-high")).toBe(
      false
    );
  });
});
