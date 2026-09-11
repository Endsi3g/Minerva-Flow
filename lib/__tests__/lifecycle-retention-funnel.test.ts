import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  LIFECYCLE_EVENT_CONFIG,
  type LifecycleEventType,
} from "@/lib/data/lifecycle-events";
import {
  getRetentionFunnelMetrics,
  type RetentionFunnelDashboardData,
} from "@/lib/data/retention-metrics";

// Mock Supabase clients
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "lifecycle_events") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                gte: vi.fn(() =>
                  Promise.resolve({
                    data: [
                      { id: "e1", event_type: "qr_code_scanned", metadata: {}, created_at: new Date().toISOString() },
                      { id: "e2", event_type: "qr_code_scanned", metadata: {}, created_at: new Date().toISOString() },
                      { id: "e3", event_type: "qr_code_scanned", metadata: {}, created_at: new Date().toISOString() },
                      { id: "e4", event_type: "form_started", metadata: {}, created_at: new Date().toISOString() },
                      { id: "e5", event_type: "form_started", metadata: {}, created_at: new Date().toISOString() },
                      { id: "e6", event_type: "registration_completed", customer_id: "c1", metadata: {}, created_at: new Date().toISOString() },
                      { id: "e7", event_type: "registration_completed", customer_id: "c2", metadata: {}, created_at: new Date().toISOString() },
                      { id: "e8", event_type: "first_visit_recognized", customer_id: "c1", metadata: { amountSpent: 25 }, created_at: new Date().toISOString() },
                      { id: "e9", event_type: "second_visit_recognized", customer_id: "c1", metadata: { amountSpent: 30 }, created_at: new Date().toISOString() },
                      { id: "e10", event_type: "reward_unlocked", customer_id: "c1", metadata: { rewardName: "Café offert" }, created_at: new Date().toISOString() },
                      { id: "e11", event_type: "reward_redeemed", customer_id: "c1", metadata: { rewardName: "Café offert", pointsSpent: 100 }, created_at: new Date().toISOString() },
                      { id: "e12", event_type: "campaign_sent", metadata: {}, created_at: new Date().toISOString() },
                      { id: "e13", event_type: "message_delivered", metadata: {}, created_at: new Date().toISOString() },
                      { id: "e14", event_type: "campaign_visit_generated", customer_id: "c1", metadata: { amountSpent: 45 }, created_at: new Date().toISOString() },
                      { id: "e15", event_type: "referral_sent", customer_id: "c1", metadata: { code: "ABC123" }, created_at: new Date().toISOString() },
                      { id: "e16", event_type: "referral_converted", customer_id: "c1", metadata: { orderId: "o1" }, created_at: new Date().toISOString() },
                    ],
                    error: null,
                  })
                ),
              })),
            })),
          })),
        };
      }

      if (table === "customers") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: "c1",
                    name: "Alexandre Tremblay",
                    visit_count: 5,
                    total_spent: 150,
                    last_visit_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                  },
                  {
                    id: "c2",
                    name: "Sophie Martin",
                    visit_count: 2,
                    total_spent: 70,
                    last_visit_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                  },
                ],
                error: null,
              })
            ),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      };
    }),
  })),
}));

describe("Lifecycle Events & Retention Funnel Suite", () => {
  const all15Events: LifecycleEventType[] = [
    "qr_code_displayed",
    "qr_code_scanned",
    "form_started",
    "registration_completed",
    "sms_consent_given",
    "first_visit_recognized",
    "second_visit_recognized",
    "reward_unlocked",
    "reward_redeemed",
    "campaign_sent",
    "message_delivered",
    "unsubscribed",
    "campaign_visit_generated",
    "referral_sent",
    "referral_converted",
  ];

  it("defines all 15 lifecycle events with valid configurations", () => {
    expect(all15Events).toHaveLength(15);
    for (const evt of all15Events) {
      const config = LIFECYCLE_EVENT_CONFIG[evt];
      expect(config).toBeDefined();
      expect(config.label.length).toBeGreaterThan(3);
      expect(config.stage.length).toBeGreaterThan(2);
      expect(config.icon.length).toBeGreaterThan(2);
    }
  });

  it("calculates the 10 essential KPIs with correct values and benchmarks", async () => {
    const data: RetentionFunnelDashboardData = await getRetentionFunnelMetrics(
      "test-rest-id",
      "30d"
    );

    const { kpis, funnelSteps, rawCounts } = data;

    // 1. Scan to signup rate
    expect(kpis.scanToSignupRate.id).toBe("scan_to_signup");
    expect(kpis.scanToSignupRate.value).toBeGreaterThan(0);
    expect(kpis.scanToSignupRate.unit).toBe("%");

    // 2. Activation rate
    expect(kpis.activationRate.id).toBe("activation_rate");
    expect(kpis.activationRate.value).toBe(100); // 2 out of 2 customers have visit_count >= 1

    // 3. Second visit rate
    expect(kpis.secondVisitRate.id).toBe("second_visit_rate");
    expect(kpis.secondVisitRate.value).toBe(100); // 2 out of 2 have visit_count >= 2
    expect(kpis.secondVisitRate.target).toContain("75 % – 100 %");
    expect(kpis.secondVisitRate.status).toBe("excellent");

    // 4. Thirty day return rate
    expect(kpis.thirtyDayReturnRate.id).toBe("thirty_day_return_rate");
    expect(kpis.thirtyDayReturnRate.value).toBe(100);

    // 5. Average visit frequency
    expect(kpis.averageVisitFrequency.id).toBe("avg_visit_frequency");
    expect(kpis.averageVisitFrequency.value).toBe(3.5); // (5 + 2) / 2 = 3.5 visits
    expect(kpis.averageVisitFrequency.formattedValue).toContain("3.5");

    // 6. Reward redemption rate
    expect(kpis.rewardRedemptionRate.id).toBe("reward_redemption_rate");
    expect(kpis.rewardRedemptionRate.value).toBe(100); // 1 redeemed / 1 unlocked

    // 7. Average member basket
    expect(kpis.averageMemberBasket.id).toBe("avg_member_basket");
    expect(kpis.averageMemberBasket.value).toBeCloseTo(220 / 7, 1); // 220 total spend / 7 total visits = 31.43 $

    // 8. Campaign attributed revenue
    expect(kpis.campaignAttributedRevenue.id).toBe("campaign_attributed_revenue");
    expect(kpis.campaignAttributedRevenue.value).toBe(45); // e14 spent 45 $
    expect(kpis.campaignAttributedRevenue.formattedValue).toContain("45");

    // 9. Cost per reactivated customer
    expect(kpis.costPerReactivatedCustomer.id).toBe("cost_per_reactivated");
    expect(kpis.costPerReactivatedCustomer.value).toBeLessThan(3.0); // very cheap vs 25 $ ads

    // 10. Unsubscribe rate
    expect(kpis.unsubscribeRate.id).toBe("unsubscribe_rate");
    expect(kpis.unsubscribeRate.value).toBe(0);
    expect(kpis.unsubscribeRate.status).toBe("excellent");

    // Funnel steps
    expect(funnelSteps).toHaveLength(5);
    expect(funnelSteps[0].id).toBe("scan");
    expect(funnelSteps[4].id).toBe("second_visit");

    // Raw counts check
    expect(rawCounts.campaignRevenue).toBe(45);
    expect(rawCounts.referralsSent).toBe(1);
    expect(rawCounts.referralsConverted).toBe(1);
    expect(rawCounts.totalMembers).toBe(2);
  });
});
