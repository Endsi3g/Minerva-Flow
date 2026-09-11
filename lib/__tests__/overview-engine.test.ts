import { describe, it, expect } from "vitest";
import { computeKpiComparisons, computeOnboardingReadiness } from "@/lib/engine/comparisons";
import { computeMultiEstablishmentRollup } from "@/lib/engine/multi-establishment";
import { computeRecommendations } from "@/lib/engine/recommendations";
import type { ServiceDay, MenuItem, Restaurant, Alert } from "@/lib/types";

function mockServiceDay(overrides: Partial<ServiceDay> = {}): ServiceDay {
  return {
    id: "d1",
    restaurantId: "resto-1",
    date: "2026-09-10",
    revenue: 1000,
    mainSource: "salle",
    anomaly: null,
    author: "admin",
    events: [],
    notes: "",
    reservationCount: 25,
    ...overrides,
  };
}

function mockMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "m1",
    restaurantId: "resto-1",
    name: "Burger",
    price: 20,
    foodCost: 6,
    unitsSold: 50,
    active: true,
    category: "Plats",
    description: null,
    imageUrl: null,
    imageUrls: [],
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("Overview Action-Oriented Engine", () => {
  describe("computeKpiComparisons", () => {
    it("computes comparisons vs yesterday and vs same day last week accurately", () => {
      const todayIso = "2026-09-10";
      const yesterdayIso = "2026-09-09";
      const lastWeekIso = "2026-09-03";

      const serviceDays: ServiceDay[] = [
        mockServiceDay({
          id: "d1",
          date: todayIso,
          revenue: 1200,
          reservationCount: 30,
        }),
        mockServiceDay({
          id: "d2",
          date: yesterdayIso,
          revenue: 1000,
          reservationCount: 25,
        }),
        mockServiceDay({
          id: "d3",
          date: lastWeekIso,
          revenue: 1100,
          reservationCount: 28,
        }),
      ];

      const menuItems: MenuItem[] = [
        mockMenuItem({ id: "m1", name: "Burger", price: 20, foodCost: 6 }),
        mockMenuItem({ id: "m2", name: "Frites", price: 5, foodCost: 1 }),
      ];

      const comparisons = computeKpiComparisons({
        todayIso,
        serviceDays,
        menuItems,
        currentLaborCostPct: 28.5,
        incrementalRetentionCurrent: 450,
      });

      // Revenue vs yesterday (+20%)
      expect(comparisons.revenue.today.currentValue).toBe(1200);
      expect(comparisons.revenue.today.previousValue).toBe(1000);
      expect(comparisons.revenue.today.changePct).toBe(20);
      expect(comparisons.revenue.today.direction).toBe("up");

      // Revenue vs same day last week (+9.1%)
      expect(comparisons.revenue.vsSameDayLastWeek.previousValue).toBe(1100);
      expect(comparisons.revenue.vsSameDayLastWeek.changePct).toBe(9.1);

      // Food Cost % = (6+1)/(20+5) = 7/25 = 28%
      expect(comparisons.foodCost.currentPct).toBe(28);
      expect(comparisons.foodCost.status).toBe("optimal");

      // Covers
      expect(comparisons.covers.todaySoFar).toBe(30);
      expect(comparisons.covers.yesterdaySameTime).toBe(25);
      expect(comparisons.covers.changePct).toBe(20);
    });
  });

  describe("computeOnboardingReadiness", () => {
    it("flags missing POS and missing recipe costs as actionable priorities", () => {
      const emptyMenuItems: MenuItem[] = [];
      const readiness = computeOnboardingReadiness({
        posConnectionCount: 0,
        menuItems: emptyMenuItems,
        serviceDaysCount: 0,
        hasBreakEvenConfigured: false,
        hasShiftSchedules: false,
      });

      expect(readiness.isFullyConfigured).toBe(false);
      expect(readiness.scorePct).toBeLessThan(50);
      expect(readiness.missingActions.some((a) => a.id === "connect-pos")).toBe(true);
      expect(readiness.missingActions.some((a) => a.id === "add-menu")).toBe(true);
    });

    it("gives a high score when POS, recipes, and break-even are configured", () => {
      const menuItems: MenuItem[] = [
        mockMenuItem({ id: "m1", name: "Plat 1", price: 25, foodCost: 7 }),
      ];

      const readiness = computeOnboardingReadiness({
        posConnectionCount: 1,
        posProvider: "Square Point de Vente",
        menuItems,
        serviceDaysCount: 10,
        hasBreakEvenConfigured: true,
        hasShiftSchedules: true,
      });

      expect(readiness.scorePct).toBe(100);
      expect(readiness.isFullyConfigured).toBe(true);
      expect(readiness.posStatus).toBe("connected");
    });
  });

  describe("computeMultiEstablishmentRollup", () => {
    it("consolidates multi-location KPIs and ranks establishments", () => {
      const restaurants: Restaurant[] = [
        {
          id: "r1",
          name: "Bistro Plateau",
          address: "Montréal",
          city: "Montréal",
          province: "QC",
          postalCode: "H2W",
          timezone: "America/Toronto",
          currency: "CAD",
          serviceModel: "table",
          operatingDays: [1, 2, 3, 4, 5],
          color: "#167f5b",
          lng: null,
          lat: null,
          website: null,
          description: "Bistro moderne",
          phone: null,
          openingHours: null,
          googlePlaceId: "place-1",
          workspaceId: "ws-1",
          loyaltyPointsPerDollar: 1,
          taxRate: 0.14975,
          acceptsTips: true,
          breakEvenFixedCosts: 10000,
          breakEvenGrossMarginPct: 70,
          breakEvenAvgBasket: 45,
          retentionEngineEnabled: true,
          retentionInactivityDays: 21,
          retentionFrequencyCapDays: 7,
          retentionBirthdayLeadDays: 3,
          loyaltyTier2Threshold: 200,
          loyaltyTier3Threshold: 500,
          visitRewardsEnabled: false,
          visitRewardTiers: [],
          imageUrls: [],
          googleMapsUrl: "https://maps.google.com",
          planTier: "croissance",
          orderModesEnabled: ["sur_place"],
          busyModeManual: false,
          busyThreshold: null,
          defaultPrepMinutes: 15,
        },
        {
          id: "r2",
          name: "Bistro Mile-End",
          address: "Montréal",
          city: "Montréal",
          province: "QC",
          postalCode: "H2T",
          timezone: "America/Toronto",
          currency: "CAD",
          serviceModel: "table",
          operatingDays: [1, 2, 3, 4, 5],
          color: "#167f5b",
          lng: null,
          lat: null,
          website: null,
          description: "Bistro de quartier",
          phone: null,
          openingHours: null,
          googlePlaceId: "place-2",
          workspaceId: "ws-1",
          loyaltyPointsPerDollar: 1,
          taxRate: 0.14975,
          acceptsTips: true,
          breakEvenFixedCosts: 8000,
          breakEvenGrossMarginPct: 70,
          breakEvenAvgBasket: 40,
          retentionEngineEnabled: true,
          retentionInactivityDays: 21,
          retentionFrequencyCapDays: 7,
          retentionBirthdayLeadDays: 3,
          loyaltyTier2Threshold: 200,
          loyaltyTier3Threshold: 500,
          visitRewardsEnabled: false,
          visitRewardTiers: [],
          imageUrls: [],
          googleMapsUrl: "https://maps.google.com",
          planTier: "croissance",
          orderModesEnabled: ["sur_place"],
          busyModeManual: false,
          busyThreshold: null,
          defaultPrepMinutes: 15,
        },
      ];

      const dataByRestaurant = new Map();
      dataByRestaurant.set("r1", {
        serviceDays: [
          mockServiceDay({
            id: "sd1",
            date: "2026-09-10",
            restaurantId: "r1",
            revenue: 5000,
            reservationCount: 100,
          }),
        ],
        menuItems: [mockMenuItem({ id: "m1", restaurantId: "r1", price: 20, foodCost: 6 })],
        laborCostPct: 30,
        todayIso: "2026-09-10",
        dailyCoversNeeded: 80,
        retentionRevenue: 800,
        posProvider: "Square",
        posStatus: "connecte",
      });

      dataByRestaurant.set("r2", {
        serviceDays: [
          mockServiceDay({
            id: "sd2",
            date: "2026-09-10",
            restaurantId: "r2",
            revenue: 3000,
            reservationCount: 60,
          }),
        ],
        menuItems: [mockMenuItem({ id: "m2", restaurantId: "r2", price: 20, foodCost: 5 })],
        laborCostPct: 28,
        todayIso: "2026-09-10",
        dailyCoversNeeded: 60,
        retentionRevenue: 450,
        posProvider: "Lightspeed",
        posStatus: "connecte",
      });

      const rollup = computeMultiEstablishmentRollup({
        restaurants,
        dataByRestaurant,
      });

      expect(rollup.restaurantCount).toBe(2);
      expect(rollup.totalMonthRevenue).toBe(8000);
      expect(rollup.totalTodayRevenue).toBe(8000);
      expect(rollup.totalCoversToday).toBe(160);
      expect(rollup.totalRetentionRevenue).toBe(1250);
      expect(rollup.benchmarks[0].name).toBe("Bistro Plateau");
      expect(rollup.benchmarks[1].name).toBe("Bistro Mile-End");
    });
  });

  describe("computeRecommendations with explainability", () => {
    it("generates recommendations with data sources, confidence, impact, and actions", () => {
      const alerts: Alert[] = [
        {
          id: "low-stock-saumon",
          title: "Stock bas — Saumon frais",
          detail: "Stock inférieur au seuil de réapprovisionnement",
          severity: "important",
          date: "2026-09-10",
        },
      ];

      const recs = computeRecommendations({
        campaigns: [],
        programs: [],
        serviceDays: [],
        alerts,
        laborCostPct: 34,
      });

      expect(recs.length).toBeGreaterThan(0);
      const stockRec = recs.find((r) => r.id.includes("low-stock"));
      expect(stockRec).toBeDefined();
      expect(stockRec?.confidenceLevel).toBe("elevee");
      expect(stockRec?.actionUrl).toBe("/fournisseurs");
      expect(stockRec?.dataSources).toBeDefined();
      expect(stockRec?.impactEstimate).toBeDefined();

      const laborRec = recs.find((r) => r.id === "rec-labor-cost-high");
      expect(laborRec).toBeDefined();
      expect(laborRec?.actionUrl).toBe("/horaire");
      expect(laborRec?.confidenceScore).toBeGreaterThan(0.9);
    });
  });
});
