import { describe, expect, it } from "vitest";
import { calculateMenuItemStockStatus } from "@/lib/stock-availability";
import type { InventoryItem, RecipeItem } from "@/lib/types";

function mockInventoryItem(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: overrides.id ?? "inv-1",
    restaurantId: "rest-1",
    name: overrides.name ?? "Farine",
    category: "Sec",
    unit: overrides.unit ?? "kg",
    quantityOnHand: overrides.quantityOnHand ?? 10,
    parLevel: overrides.parLevel ?? 5,
    unitCost: overrides.unitCost ?? 2.5,
    supplierId: overrides.supplierId ?? "supp-1",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function mockRecipeItem(overrides: Partial<RecipeItem>): RecipeItem {
  return {
    id: overrides.id ?? "rec-1",
    restaurantId: "rest-1",
    menuItemId: overrides.menuItemId ?? "dish-1",
    inventoryItemId: overrides.inventoryItemId ?? "inv-1",
    quantityPerUnit: overrides.quantityPerUnit ?? 0.2,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("calculateMenuItemStockStatus", () => {
  it("returns untracked when a dish has no recipe", () => {
    const inventoryMap = new Map<string, InventoryItem>();
    const res = calculateMenuItemStockStatus([], inventoryMap);
    expect(res.status).toBe("untracked");
    expect(res.portionsAvailable).toBeNull();
  });

  it("returns rupture (0 portions) when at least one ingredient is at 0 or insufficient", () => {
    const inv1 = mockInventoryItem({ id: "inv-flour", name: "Farine", quantityOnHand: 0 });
    const inv2 = mockInventoryItem({ id: "inv-butter", name: "Beurre", quantityOnHand: 5 });

    const inventoryMap = new Map([
      ["inv-flour", inv1],
      ["inv-butter", inv2],
    ]);

    const recipes = [
      mockRecipeItem({ inventoryItemId: "inv-flour", quantityPerUnit: 0.2 }),
      mockRecipeItem({ inventoryItemId: "inv-butter", quantityPerUnit: 0.1 }),
    ];

    const res = calculateMenuItemStockStatus(recipes, inventoryMap);
    expect(res.status).toBe("rupture");
    expect(res.portionsAvailable).toBe(0);
    expect(res.limitingIngredientName).toBe("Farine");
  });

  it("returns critique when portions are between 1 and 5", () => {
    const inv1 = mockInventoryItem({ id: "inv-flour", name: "Farine", quantityOnHand: 0.6 }); // 0.6 / 0.2 = 3 portions
    const inv2 = mockInventoryItem({ id: "inv-butter", name: "Beurre", quantityOnHand: 10 }); // 10 / 0.1 = 100 portions

    const inventoryMap = new Map([
      ["inv-flour", inv1],
      ["inv-butter", inv2],
    ]);

    const recipes = [
      mockRecipeItem({ inventoryItemId: "inv-flour", quantityPerUnit: 0.2 }),
      mockRecipeItem({ inventoryItemId: "inv-butter", quantityPerUnit: 0.1 }),
    ];

    const res = calculateMenuItemStockStatus(recipes, inventoryMap);
    expect(res.status).toBe("critique");
    expect(res.portionsAvailable).toBe(3);
    expect(res.limitingIngredientName).toBe("Farine");
  });

  it("returns ok when available portions exceed 5", () => {
    const inv1 = mockInventoryItem({ id: "inv-flour", name: "Farine", quantityOnHand: 10 }); // 10 / 0.2 = 50 portions
    const inv2 = mockInventoryItem({ id: "inv-butter", name: "Beurre", quantityOnHand: 5 }); // 5 / 0.1 = 50 portions

    const inventoryMap = new Map([
      ["inv-flour", inv1],
      ["inv-butter", inv2],
    ]);

    const recipes = [
      mockRecipeItem({ inventoryItemId: "inv-flour", quantityPerUnit: 0.2 }),
      mockRecipeItem({ inventoryItemId: "inv-butter", quantityPerUnit: 0.1 }),
    ];

    const res = calculateMenuItemStockStatus(recipes, inventoryMap);
    expect(res.status).toBe("ok");
    expect(res.portionsAvailable).toBe(50);
  });
});
