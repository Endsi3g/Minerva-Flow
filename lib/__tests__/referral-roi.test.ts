import { describe, it, expect } from "vitest";

describe("Referral ROI calculations", () => {
  it("computes accurate ROI multiplier and conversion rates", () => {
    const totalClicks = 120;
    const totalConversions = 24;
    const conversionRatePct = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 1000) / 10 : 0;
    expect(conversionRatePct).toBe(20.0);

    const revenueGenerated = 24 * 45; // $1,080
    const rewardsCost = 24 * 3.5 + 2 * 12; // $84 + $24 = $108
    const roiMultiplier = Math.round((revenueGenerated / rewardsCost) * 10) / 10;

    expect(roiMultiplier).toBe(10.0);
    expect(revenueGenerated - rewardsCost).toBe(972);
  });
});
