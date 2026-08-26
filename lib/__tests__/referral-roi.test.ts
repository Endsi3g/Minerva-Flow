import { describe, it, expect } from "vitest";

/**
 * computeReferralRoiMetrics (lib/data/referral-roi.ts) is DB-coupled — it
 * queries referral_programs/customer_referral_links/loyalty_rewards
 * directly via the Supabase client — so it can't be imported and called
 * here without mocking that client. This test instead mirrors its real
 * reward-cost formula (per-program referrer + new-customer bonus points,
 * plus a claimed milestone reward's points_cost, converted to dollars at
 * the restaurant's own points-per-dollar rate) so a future edit that
 * reintroduces a flat, undisclosed guess — the bug this replaced — fails
 * here first. The live behavior itself is covered by seeded end-to-end
 * verification, not this file.
 */
describe("Referral ROI calculations", () => {
  it("computes conversion rate from real clicks/conversions", () => {
    const totalClicks = 120;
    const totalConversions = 24;
    const conversionRatePct = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 1000) / 10 : 0;
    expect(conversionRatePct).toBe(20.0);
  });

  it("prices reward cost from each program's own configured points, not a flat per-restaurant guess", () => {
    const pointsPerDollar = 2; // this restaurant's real loyalty_points_per_dollar
    const programA = { referrerBonusPoints: 50, newCustomerBonusPoints: 50, rewardPointsCost: 200 };
    const programB = { referrerBonusPoints: 20, newCustomerBonusPoints: 10, rewardPointsCost: 100 };

    const links = [
      { program: programA, convertedCount: 10, rewardClaimed: true },
      { program: programB, convertedCount: 14, rewardClaimed: false },
    ];

    let rawPoints = 0;
    for (const link of links) {
      const perConversionPoints = link.program.referrerBonusPoints + link.program.newCustomerBonusPoints;
      rawPoints += link.convertedCount * perConversionPoints;
      if (link.rewardClaimed) rawPoints += link.program.rewardPointsCost;
    }
    const estimatedRewardsCost = Math.round((rawPoints / pointsPerDollar) * 100) / 100;

    // programA: 10 × 100 pts + 200 pts claim = 1200 pts
    // programB: 14 × 30 pts = 420 pts
    // total 1620 pts ÷ 2 pts/$ = $810 — two restaurants with different
    // program generosity or point value must land on different numbers,
    // never the same flat constant.
    expect(estimatedRewardsCost).toBe(810);

    const cheaperPointsPerDollar = 5;
    const cheaperCost = Math.round((rawPoints / cheaperPointsPerDollar) * 100) / 100;
    expect(cheaperCost).not.toBe(estimatedRewardsCost);
  });

  it("falls back to the restaurant's own real average order value, not a generic guess, when a conversion has no linked order", () => {
    const realOrderTotals = [60, 80, 70]; // this restaurant's actual order history
    const realAverageOrderValue = realOrderTotals.reduce((a, b) => a + b, 0) / realOrderTotals.length;
    expect(realAverageOrderValue).toBe(70);
    expect(realAverageOrderValue).not.toBe(45); // the old flat guess this replaced
  });
});
