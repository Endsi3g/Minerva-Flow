import { describe, expect, it } from "vitest";
import {
  countUpValue,
  easeOutCubic,
  formatMetricValue,
  minervaShareMetrics,
  restaurantShareMetrics,
  staggeredProgress,
  type RestaurantResultsInput,
} from "@/lib/share/results";

const base: RestaurantResultsInput = {
  newMembers: 0,
  returningMembers: 0,
  totalMembers: 0,
  ordersServed: 0,
  reviewAverage: null,
  reviewCount: 0,
  periodDays: 30,
};

describe("restaurantShareMetrics", () => {
  it("shows nothing when there is nothing real to show", () => {
    expect(restaurantShareMetrics(base)).toEqual([]);
  });

  it("never turns a zero into a metric", () => {
    const keys = restaurantShareMetrics({ ...base, newMembers: 12 }).map((m) => m.key);
    expect(keys).toEqual(["newMembers"]);
  });

  it("hides the rating until there are enough public reviews", () => {
    expect(restaurantShareMetrics({ ...base, reviewAverage: 5, reviewCount: 2 })).toEqual([]);
    const shown = restaurantShareMetrics({ ...base, reviewAverage: 4.66, reviewCount: 3 });
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ key: "rating", value: 4.7, kind: "rating" });
  });

  it("states the period in the label", () => {
    const [metric] = restaurantShareMetrics({ ...base, newMembers: 5, periodDays: 7 });
    expect(metric.label).toContain("7 derniers jours");
  });
});

describe("minervaShareMetrics", () => {
  it("exposes only product-usage figures, never financial or inflated ones", () => {
    const metrics = minervaShareMetrics({ restaurantsWithMenu: 18, restaurantsActivated: 1, customersEnrolled: 2, ordersServed: 9 });
    expect(metrics.map((m) => m.key)).toEqual(["withMenu", "activated", "customers", "orders"]);
    expect(JSON.stringify(metrics).toLowerCase()).not.toMatch(/mrr|churn|revenu|inscrits? à minerva/);
  });

  it("omits zero figures", () => {
    expect(minervaShareMetrics({ restaurantsWithMenu: 0, restaurantsActivated: 0, customersEnrolled: 0, ordersServed: 0 })).toEqual([]);
  });
});

describe("count-up animation", () => {
  const metric = { key: "k", label: "L", value: 120, kind: "count" as const };

  it("starts at zero and ends on the exact real value", () => {
    expect(countUpValue(metric, 0)).toBe(0);
    expect(countUpValue(metric, 1)).toBe(120);
  });

  it("shows a rating only at its true value, never a partial one", () => {
    const rating = { key: "r", label: "L", value: 4.7, kind: "rating" as const };
    expect(countUpValue(rating, 0)).toBe(0);
    expect(countUpValue(rating, 0.3)).toBe(4.7);
    expect(countUpValue(rating, 1)).toBe(4.7);
  });

  it("never overshoots or goes negative", () => {
    expect(countUpValue(metric, 2)).toBe(120);
    expect(countUpValue(metric, -1)).toBe(0);
    expect(easeOutCubic(5)).toBe(1);
  });

  it("staggers metrics but every one is complete at t = 1", () => {
    for (let i = 0; i < 4; i++) expect(staggeredProgress(1, i, 4)).toBeCloseTo(1, 10);
    expect(staggeredProgress(0.1, 3, 4)).toBe(0);
    expect(staggeredProgress(0.2, 0, 4)).toBeGreaterThan(staggeredProgress(0.2, 3, 4));
  });

  it("formats ratings with a French comma and counts with locale grouping", () => {
    expect(formatMetricValue({ key: "r", label: "", value: 4.7, kind: "rating" }, 4.7)).toBe("4,7 ★");
    expect(formatMetricValue(metric, 120)).toBe("120");
  });
});

import { layoutMetricRows } from "@/lib/share/draw-results";

describe("layoutMetricRows", () => {
  it("returns no rows for no metrics", () => {
    expect(layoutMetricRows(0, 1920, 500, 170)).toEqual([]);
  });

  it("keeps every row between the header and the footer", () => {
    for (const [height, count] of [[1920, 1], [1920, 4], [1080, 4], [1080, 2]] as const) {
      const rows = layoutMetricRows(count, height, 380, 100);
      expect(rows).toHaveLength(count);
      for (const row of rows) {
        expect(row.centerY).toBeGreaterThan(380);
        expect(row.centerY).toBeLessThan(height - 100);
      }
    }
  });

  it("shrinks type as rows get more numerous", () => {
    const few = layoutMetricRows(2, 1080, 380, 100)[0];
    const many = layoutMetricRows(4, 1080, 380, 100)[0];
    expect(many.numberSize).toBeLessThanOrEqual(few.numberSize);
  });
});
