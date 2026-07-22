import { describe, expect, it } from "vitest";
import { computeOrderPricing } from "@/lib/data/order-pricing";

const MENU = new Map([
  ["item-1", { id: "item-1", name: "Burger", price: 15 }],
  ["item-2", { id: "item-2", name: "Frites", price: 5 }],
]);

describe("computeOrderPricing", () => {
  it("computes subtotal/tax/tip/total from server-known prices, not client input", () => {
    const result = computeOrderPricing({
      cart: [
        { menuItemId: "item-1", quantity: 2 },
        { menuItemId: "item-2", quantity: 1 },
      ],
      menuItemById: MENU,
      taxRate: 0.14975,
      acceptsTips: true,
      requestedTipAmount: 5,
    });

    expect(result).not.toBeNull();
    expect(result!.subtotal).toBe(35);
    expect(result!.taxAmount).toBeCloseTo(5.24, 2);
    expect(result!.tipAmount).toBe(5);
    expect(result!.total).toBeCloseTo(45.24, 2);
    expect(result!.lineItems).toEqual([
      { menuItemId: "item-1", itemName: "Burger", unitPrice: 15, quantity: 2 },
      { menuItemId: "item-2", itemName: "Frites", unitPrice: 5, quantity: 1 },
    ]);
  });

  it("drops lines for items no longer in the active menu (deleted/deactivated since page load)", () => {
    const result = computeOrderPricing({
      cart: [
        { menuItemId: "item-1", quantity: 1 },
        { menuItemId: "unknown-item", quantity: 3 },
      ],
      menuItemById: MENU,
      taxRate: 0.14975,
      acceptsTips: false,
      requestedTipAmount: 0,
    });

    expect(result!.lineItems).toHaveLength(1);
    expect(result!.subtotal).toBe(15);
  });

  it("drops non-finite or non-positive quantities", () => {
    const result = computeOrderPricing({
      cart: [
        { menuItemId: "item-1", quantity: 0 },
        { menuItemId: "item-1", quantity: -2 },
        { menuItemId: "item-1", quantity: NaN },
      ],
      menuItemById: MENU,
      taxRate: 0.14975,
      acceptsTips: false,
      requestedTipAmount: 0,
    });

    expect(result).toBeNull();
  });

  it("ignores the requested tip when the restaurant doesn't accept tips", () => {
    const result = computeOrderPricing({
      cart: [{ menuItemId: "item-1", quantity: 1 }],
      menuItemById: MENU,
      taxRate: 0.14975,
      acceptsTips: false,
      requestedTipAmount: 10,
    });

    expect(result!.tipAmount).toBe(0);
  });

  it("clamps a negative tip to zero even when tips are accepted", () => {
    const result = computeOrderPricing({
      cart: [{ menuItemId: "item-1", quantity: 1 }],
      menuItemById: MENU,
      taxRate: 0.14975,
      acceptsTips: true,
      requestedTipAmount: -5,
    });

    expect(result!.tipAmount).toBe(0);
  });

  it("returns null for an empty cart", () => {
    const result = computeOrderPricing({
      cart: [],
      menuItemById: MENU,
      taxRate: 0.14975,
      acceptsTips: false,
      requestedTipAmount: 0,
    });

    expect(result).toBeNull();
  });
});
