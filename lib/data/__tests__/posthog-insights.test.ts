import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/analytics/posthog-query", () => ({
  runHogQL: vi.fn(),
  runInsightQuery: vi.fn(),
  isPostHogQueryConfigured: vi.fn(),
}));

import { runHogQL } from "@/lib/analytics/posthog-query";
import { getOnboardingFunnel } from "../posthog-insights";

const mockHogQL = vi.mocked(runHogQL);

describe("getOnboardingFunnel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if query fails or returns empty", async () => {
    mockHogQL.mockResolvedValueOnce(null);
    const result = await getOnboardingFunnel(30);
    expect(result).toBeNull();
  });

  it("calculates funnel steps, conversions and dropoffs correctly", async () => {
    mockHogQL.mockResolvedValueOnce({
      columns: ["step_1_viewed", "step_1_completed", "step_2_completed", "step_3_completed", "step_4_completed", "step_5_completed", "completed"],
      results: [[100, 80, 60, 50, 40, 30, 25]],
    });

    const result = await getOnboardingFunnel(30);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.totalStarted).toBe(100);
    expect(result.totalCompleted).toBe(25);
    expect(result.overallConversionRate).toBe(25);

    expect(result.steps).toHaveLength(6);
    // Step 1
    expect(result.steps[0]).toMatchObject({
      step: 1,
      count: 80,
      conversionFromFirst: 80,
      conversionFromPrev: 80,
    });
    // Step 2
    expect(result.steps[1]).toMatchObject({
      step: 2,
      count: 60,
      conversionFromFirst: 60,
      conversionFromPrev: 75, // 60/80 = 75%
      dropoffRate: 25,
    });
    // Step 6 (Completed)
    expect(result.steps[5]).toMatchObject({
      step: 6,
      count: 25,
      conversionFromFirst: 25,
      dropoffRate: expect.any(Number),
    });
  });
});
