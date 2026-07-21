import { describe, expect, it } from "vitest";
import { classifyMenuItems } from "@/lib/menu-engineering";
import type { MenuItem } from "@/lib/types";

function item(overrides: Partial<MenuItem>): MenuItem {
  return {
    id: overrides.id ?? "item-1",
    restaurantId: "restaurant-1",
    name: overrides.name ?? "Plat",
    category: null,
    price: 10,
    foodCost: 5,
    unitsSold: 10,
    active: true,
    description: null,
    imageUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("classifyMenuItems", () => {
  it("returns an empty list when there are no active items", () => {
    expect(classifyMenuItems([item({ active: false })])).toEqual([]);
  });

  it("classifies a popular, above-average-margin item as étoile", () => {
    const items = [
      item({ id: "a", price: 20, foodCost: 5, unitsSold: 50 }), // high margin, high sales
      item({ id: "b", price: 10, foodCost: 8, unitsSold: 5 }), // low margin, low sales
    ];
    const [star] = classifyMenuItems(items);
    expect(star.quadrant).toBe("etoile");
  });

  it("classifies a popular but below-average-margin item as cheval_bataille", () => {
    const items = [
      item({ id: "a", price: 20, foodCost: 5, unitsSold: 5 }), // high margin, low sales
      item({ id: "b", price: 10, foodCost: 9, unitsSold: 50 }), // low margin, high sales
    ];
    const chevalBataille = classifyMenuItems(items).find((i) => i.id === "b");
    expect(chevalBataille?.quadrant).toBe("cheval_bataille");
  });

  it("classifies an unpopular but above-average-margin item as enigme", () => {
    const items = [
      item({ id: "a", price: 20, foodCost: 5, unitsSold: 5 }), // high margin, low sales
      item({ id: "b", price: 10, foodCost: 9, unitsSold: 50 }), // low margin, high sales
    ];
    const enigme = classifyMenuItems(items).find((i) => i.id === "a");
    expect(enigme?.quadrant).toBe("enigme");
  });

  it("classifies an unpopular, below-average-margin item as poids_mort", () => {
    const items = [
      item({ id: "a", price: 20, foodCost: 5, unitsSold: 50 }), // high margin, high sales
      item({ id: "b", price: 10, foodCost: 9, unitsSold: 1 }), // low margin, low sales
    ];
    const poidsMort = classifyMenuItems(items).find((i) => i.id === "b");
    expect(poidsMort?.quadrant).toBe("poids_mort");
  });

  it("computes margin and margin percentage correctly", () => {
    const [result] = classifyMenuItems([item({ price: 20, foodCost: 5 })]);
    expect(result.margin).toBe(15);
    expect(result.marginPct).toBe(0.75);
    expect(result.foodCostPct).toBe(0.25);
  });

  it("does not divide by zero when price is 0", () => {
    const [result] = classifyMenuItems([item({ price: 0, foodCost: 0 })]);
    expect(result.marginPct).toBeNull();
    expect(result.foodCostPct).toBeNull();
  });

  it("excludes inactive items from the average but still classifies them", () => {
    const items = [
      item({ id: "a", active: true, price: 20, foodCost: 5, unitsSold: 50 }),
      item({ id: "inactive", active: false, price: 10, foodCost: 9, unitsSold: 1 }),
    ];
    const result = classifyMenuItems(items);
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.id === "inactive")).toBeDefined();
  });
});
