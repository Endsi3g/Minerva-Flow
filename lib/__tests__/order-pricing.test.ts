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

  it("rejects the whole cart when a menu item became inactive since page load", () => {
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

    expect(result).toBeNull();
  });

  it("rejects non-finite or non-positive quantities", () => {
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

  it("rejects fractional quantities rather than allowing a database error or a partial cart", () => {
    const result = computeOrderPricing({
      cart: [
        { menuItemId: "item-1", quantity: 1 },
        { menuItemId: "item-2", quantity: 1.5 },
      ],
      menuItemById: MENU,
      taxRate: 0.14975,
      acceptsTips: false,
      requestedTipAmount: 0,
    });

    expect(result).toBeNull();
  });

  it("rejects corrupted tax/menu prices and totals that cannot fit order money columns", () => {
    const base = {
      cart: [{ menuItemId: "item-1", quantity: 1 }],
      menuItemById: MENU,
      acceptsTips: false,
      requestedTipAmount: 0,
    };

    expect(computeOrderPricing({ ...base, taxRate: Number.NaN })).toBeNull();
    expect(computeOrderPricing({ ...base, taxRate: 1.01 })).toBeNull();
    expect(computeOrderPricing({
      ...base,
      menuItemById: new Map([["item-1", { id: "item-1", name: "Broken", price: Number.POSITIVE_INFINITY }]]),
      taxRate: 0,
    })).toBeNull();
    expect(computeOrderPricing({
      ...base,
      cart: [{ menuItemId: "item-1", quantity: 2 }],
      menuItemById: new Map([["item-1", { id: "item-1", name: "Bulk order", price: 60_000_000 }]]),
      taxRate: 0,
    })).toBeNull();
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
