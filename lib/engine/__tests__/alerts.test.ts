import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeAlerts, type ComputeAlertsInput } from "@/lib/engine/alerts";
import type { AlertRule, Connection, FinancialTransaction, ServiceDay } from "@/lib/types";

function rule(overrides: Partial<AlertRule>): AlertRule {
  return {
    id: overrides.type ?? "revenue_drop",
    type: "revenue_drop",
    label: "Test rule",
    description: "",
    threshold: 25,
    unit: "%",
    enabled: true,
    notify: true,
    ...overrides,
  };
}

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

function baseInput(overrides: Partial<ComputeAlertsInput> = {}): ComputeAlertsInput {
  return {
    serviceDays: [],
    connections: [],
    alertRules: [],
    financialTransactions: [],
    ...overrides,
  };
}

describe("computeAlerts — revenue_drop", () => {
  it("flags a day well below the average of the same weekday", () => {
    // 2026-03-02, -09, -16 are all Mondays; -09 crashes relative to the others.
    const input = baseInput({
      alertRules: [rule({ type: "revenue_drop", threshold: 25 })],
      serviceDays: [
        serviceDay({ id: "a", date: "2026-03-02", revenue: 1000 }),
        serviceDay({ id: "b", date: "2026-03-09", revenue: 200 }),
        serviceDay({ id: "c", date: "2026-03-16", revenue: 1000 }),
      ],
    });
    const alerts = computeAlerts(input);
    expect(alerts.some((a) => a.id === "revenue-drop-b")).toBe(true);
  });

  it("does nothing when the rule is disabled", () => {
    const input = baseInput({
      alertRules: [rule({ type: "revenue_drop", enabled: false })],
      serviceDays: [
        serviceDay({ id: "a", date: "2026-03-02", revenue: 1000 }),
        serviceDay({ id: "b", date: "2026-03-09", revenue: 10 }),
      ],
    });
    expect(computeAlerts(input)).toHaveLength(0);
  });
});

describe("computeAlerts — broken_sync", () => {
  it("flags every connection in error status", () => {
    const connections: Connection[] = [
      { id: "1", name: "Square", type: "pos", status: "erreur", lastSync: "2026-03-01" },
      { id: "2", name: "Banque", type: "banque", status: "connecte", lastSync: "2026-03-01" },
    ];
    const input = baseInput({ alertRules: [rule({ type: "broken_sync" })], connections });
    const alerts = computeAlerts(input);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe("broken-sync-1");
    expect(alerts[0].severity).toBe("critique");
  });
});

describe("computeAlerts — missing_day_input", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flags a gap since the last logged service day beyond the threshold", () => {
    const input = baseInput({
      alertRules: [rule({ type: "missing_day_input", threshold: 5, unit: "jours" })],
      serviceDays: [serviceDay({ date: "2026-03-10" })], // 10 days before the frozen "now"
    });
    const alerts = computeAlerts(input);
    expect(alerts.some((a) => a.id === "missing-day-input")).toBe(true);
  });

  it("does not flag a recent enough last entry", () => {
    const input = baseInput({
      alertRules: [rule({ type: "missing_day_input", threshold: 5, unit: "jours" })],
      serviceDays: [serviceDay({ date: "2026-03-18" })], // 2 days before the frozen "now"
    });
    expect(computeAlerts(input).some((a) => a.id === "missing-day-input")).toBe(false);
  });
});

describe("computeAlerts — expense_spike", () => {
  it("flags a transaction well above its category's average", () => {
    const financialTransactions: FinancialTransaction[] = [
      { id: "1", date: "2026-03-01", description: "Normal", amount: -100, direction: "out", category: "Fournisseurs", sourceAccount: "x", programId: null, reviewed: true, createdBy: null, updatedBy: null, updatedAt: null },
      { id: "2", date: "2026-03-02", description: "Normal 2", amount: -110, direction: "out", category: "Fournisseurs", sourceAccount: "x", programId: null, reviewed: true, createdBy: null, updatedBy: null, updatedAt: null },
      { id: "3", date: "2026-03-03", description: "Spike", amount: -900, direction: "out", category: "Fournisseurs", sourceAccount: "x", programId: null, reviewed: true, createdBy: null, updatedBy: null, updatedAt: null },
    ];
    const input = baseInput({
      alertRules: [rule({ type: "expense_spike", threshold: 50 })],
      financialTransactions,
    });
    const alerts = computeAlerts(input);
    expect(alerts.some((a) => a.id === "expense-spike-3")).toBe(true);
  });
});

describe("computeAlerts — sorting", () => {
  it("returns alerts most-recent-date first", () => {
    const input = baseInput({
      alertRules: [rule({ type: "broken_sync" })],
      connections: [
        { id: "1", name: "A", type: "pos", status: "erreur", lastSync: "2026-03-01" },
      ],
    });
    const alerts = computeAlerts(input);
    const dates = alerts.map((a) => a.date);
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
  });
});
