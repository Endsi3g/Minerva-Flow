import { describe, expect, it } from "vitest";
import { computeLifetimeValueComponents } from "@/lib/engine/lifetime-value";
import type { Customer, MenuItem } from "@/lib/types";

const customers = [
  { totalSpent: 100 },
  { totalSpent: 300 },
] as Customer[];

function item(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "item-1", restaurantId: "r1", name: "Plat", category: "Mains", price: 10,
    foodCost: 4, unitsSold: 20, active: true, isDraft: false, description: null,
    imageUrl: null, imageUrls: [], createdAt: "2026-01-01", updatedAt: "2026-01-01", ...overrides,
  };
}

describe("computeLifetimeValueComponents", () => {
  it("adds average revenue LTV and weighted margin LTV", () => {
    expect(computeLifetimeValueComponents(customers, [item()])).toMatchObject({
      customerCount: 2,
      revenueLtv: 200,
      grossMarginPct: 0.6,
      marginLtv: 120,
      combinedLtv: 320,
    });
  });

  it("leaves margin and combined LTV unconfirmed when a cost or sales weights are missing", () => {
    expect(computeLifetimeValueComponents(customers, [item({ foodCost: 0 })])).toMatchObject({
      grossMarginPct: null, marginLtv: null, combinedLtv: null, missingCostItemCount: 1,
    });
    expect(computeLifetimeValueComponents(customers, [item({ unitsSold: 0 })])).toMatchObject({
      grossMarginPct: null, marginLtv: null, combinedLtv: null, hasSalesWeights: false,
    });
  });
});
