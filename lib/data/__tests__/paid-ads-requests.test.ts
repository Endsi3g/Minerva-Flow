import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { paidAdsPriorityScore } from "../paid-ads-requests";

describe("paid ads request priority", () => {
  it("ranks budget, operating volume, and urgency with the documented weights", () => {
    expect(paidAdsPriorityScore({
      monthlyBudgetRange: "over_5000",
      weeklyVolumeEstimate: "over_400",
      desiredStartTimeframe: "immediately",
    })).toBe(20);
  });

  it("gives uncertain requests a zero score and preserves deterministic ties", () => {
    const uncertain = {
      monthlyBudgetRange: "not_sure",
      weeklyVolumeEstimate: "not_sure",
      desiredStartTimeframe: "exploring",
    } as const;
    expect(paidAdsPriorityScore(uncertain)).toBe(0);
    expect(paidAdsPriorityScore(uncertain)).toBe(paidAdsPriorityScore(uncertain));
  });
});
