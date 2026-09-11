import { describe, it, expect } from "vitest";
import { PLAN_AI_QUOTAS, PLAN_NAMES, calculateQuotaUsage } from "@/lib/ai/quotas";

describe("AI Quotas & Tier Billing", () => {
  it("should have correct token quotas per plan tier", () => {
    expect(PLAN_AI_QUOTAS.essentiel).toBe(100_000);
    expect(PLAN_AI_QUOTAS.croissance).toBe(500_000);
    expect(PLAN_AI_QUOTAS.marque_blanche).toBe(2_000_000);
  });

  it("should properly map plan names", () => {
    expect(PLAN_NAMES.essentiel).toBe("Profit Core");
    expect(PLAN_NAMES.croissance).toBe("Growth & Loyalty");
    expect(PLAN_NAMES.marque_blanche).toBe("Enterprise / Multi-sites");
  });

  it("should correctly compute quota percentages and exceeded status", () => {
    const quota = PLAN_AI_QUOTAS.essentiel;

    expect(calculateQuotaUsage(50_000, quota)).toEqual({ percentUsed: 50, isExceeded: false });
    expect(calculateQuotaUsage(100_000, quota)).toEqual({ percentUsed: 100, isExceeded: true });
    expect(calculateQuotaUsage(120_000, quota)).toEqual({ percentUsed: 100, isExceeded: true });
  });
});
