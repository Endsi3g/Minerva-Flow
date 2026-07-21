import { describe, expect, it } from "vitest";
import { computeRecommendations, type ComputeRecommendationsInput } from "@/lib/engine/recommendations";
import type { Alert, Campaign, Program, ServiceDay } from "@/lib/types";

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
    const recs = computeRecommendations(baseInput({ alerts: [alert({ id: "revenue-drop-x", date: "2026-03-09" })] }));
    expect(recs.some((r) => r.id === "rec-weak-weekday")).toBe(true);
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
});
