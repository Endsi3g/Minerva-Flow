import { describe, expect, it } from "vitest";
import { breakdownFor, buildReports, joursTrend, margeTrend, revenueTrend, type ReportData } from "@/lib/reports";
import type { FinancialTransaction, ServiceDay } from "@/lib/types";

function serviceDay(overrides: Partial<ServiceDay>): ServiceDay {
  return {
    id: overrides.id ?? "day-1",
    date: overrides.date ?? "2026-03-01",
    restaurantId: "restaurant-1",
    revenue: 1000,
    mainSource: "salle",
    events: [],
    notes: "",
    anomaly: null,
    author: "Test",
    ...overrides,
  };
}

function transaction(overrides: Partial<FinancialTransaction>): FinancialTransaction {
  return {
    id: overrides.id ?? "txn-1",
    date: "2026-03-01",
    description: "Test",
    amount: 100,
    direction: "out",
    category: "Fournisseurs",
    sourceAccount: "Compte",
    programId: null,
    reviewed: true,
    createdBy: null,
    updatedBy: null,
    updatedAt: null,
    ...overrides,
  };
}

function baseData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    serviceDays: [],
    programs: [],
    campaigns: [],
    financialTransactions: [],
    ...overrides,
  };
}

describe("revenueTrend", () => {
  it("sorts service days chronologically regardless of input order", () => {
    const data = baseData({
      serviceDays: [
        serviceDay({ id: "b", date: "2026-03-02", revenue: 200 }),
        serviceDay({ id: "a", date: "2026-03-01", revenue: 100 }),
      ],
    });
    expect(revenueTrend(data).map((d) => d.date)).toEqual(["2026-03-01", "2026-03-02"]);
  });
});

describe("margeTrend", () => {
  it("uses revenue minus expenses when expenses are recorded", () => {
    const data = baseData({ serviceDays: [serviceDay({ revenue: 1000, expenses: 400 })] });
    expect(margeTrend(data)[0].revenue).toBe(600);
  });

  it("never goes negative even if expenses exceed revenue", () => {
    const data = baseData({ serviceDays: [serviceDay({ revenue: 100, expenses: 500 })] });
    expect(margeTrend(data)[0].revenue).toBe(0);
  });

  it("falls back to a 52.4% estimate when expenses aren't recorded", () => {
    const data = baseData({ serviceDays: [serviceDay({ revenue: 1000, expenses: undefined })] });
    expect(margeTrend(data)[0].revenue).toBe(524);
  });
});

describe("joursTrend", () => {
  it("mirrors revenue per day", () => {
    const data = baseData({ serviceDays: [serviceDay({ revenue: 777 })] });
    expect(joursTrend(data)[0].revenue).toBe(777);
  });
});

describe("breakdownFor", () => {
  it("groups outflow transactions by category with correct percentages", () => {
    const data = baseData({
      financialTransactions: [
        transaction({ category: "Fournisseurs", amount: 300, direction: "out" }),
        transaction({ category: "Loyer", amount: 700, direction: "out" }),
        transaction({ category: "Ventes", amount: 5000, direction: "in" }), // excluded
      ],
    });
    const lines = breakdownFor("sorties", data);
    expect(lines).toHaveLength(2);
    const loyer = lines.find((l) => l.label === "Loyer");
    expect(loyer?.amount).toBe(700);
    expect(loyer?.pct).toBe(70);
  });

  it("returns an empty array for an unknown slug", () => {
    expect(breakdownFor("nope", baseData())).toEqual([]);
  });
});

describe("buildReports", () => {
  it("totals revenue and margin across all service days", () => {
    const data = baseData({
      serviceDays: [
        serviceDay({ id: "a", date: "2026-03-01", revenue: 1000, expenses: 500 }),
        serviceDay({ id: "b", date: "2026-03-02", revenue: 2000, expenses: 1000 }),
      ],
    });
    const revenu = buildReports(data).find((r) => r.slug === "revenu");
    const marge = buildReports(data).find((r) => r.slug === "marge");
    expect(revenu?.value).toBe(3000);
    expect(marge?.value).toBe(1500);
  });

  it("counts only active campaigns", () => {
    const data = baseData({
      campaigns: [
        { id: "1", name: "A", type: "post", channel: "Instagram", restaurantId: "r1", startDate: "2026-01-01", endDate: "2026-01-31", status: "active", description: "", estimatedRevenue: 0, impact: "faible", visites: 0, timeline: [], notes: [] },
        { id: "2", name: "B", type: "post", channel: "Instagram", restaurantId: "r1", startDate: "2026-01-01", endDate: "2026-01-31", status: "terminee", description: "", estimatedRevenue: 0, impact: "faible", visites: 0, timeline: [], notes: [] },
      ],
    });
    const campagnes = buildReports(data).find((r) => r.slug === "campagnes");
    expect(campagnes?.value).toBe(1);
  });
});
