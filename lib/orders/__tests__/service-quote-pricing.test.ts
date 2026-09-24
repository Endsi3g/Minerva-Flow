import { describe, expect, it } from "vitest";
import { calculateServiceQuoteTotals, normalizeServiceQuoteLines } from "../service-quote-pricing";

describe("calculateServiceQuoteTotals", () => {
  it("adds line quantities, tax, and deposit using rounded currency amounts", () => {
    expect(calculateServiceQuoteTotals([
      { quantity: 12, unitPrice: 24.5 },
      { quantity: 1, unitPrice: 80 },
    ], 0.14975, 30)).toEqual({ subtotal: 374, taxAmount: 56.01, total: 430.01, depositAmount: 129 });
  });

  it("rejects invalid line values, extreme tax, and Stripe deposits below its minimum", () => {
    expect(calculateServiceQuoteTotals([{ quantity: 0, unitPrice: 10 }], 0.14975, 30)).toBeNull();
    expect(calculateServiceQuoteTotals([{ quantity: 1, unitPrice: 10 }], 0.31, 30)).toBeNull();
    expect(calculateServiceQuoteTotals([{ quantity: 1, unitPrice: 1 }], 0, 10)).toBeNull();
  });

  it("normalizes valid owner line labels without changing billable amounts", () => {
    expect(normalizeServiceQuoteLines([{
      name: "  Plateau   repas ",
      description: "  Option   végétarienne  ",
      quantity: 2,
      unitPrice: 12.5,
    }])).toEqual([{
      name: "Plateau repas",
      description: "Option végétarienne",
      quantity: 2,
      unitPrice: 12.5,
    }]);
  });

  it("rejects rather than truncates quotes above the database's 50-line limit", () => {
    const lines = Array.from({ length: 51 }, (_, index) => ({
      name: `Line ${index + 1}`,
      quantity: 1,
      unitPrice: 1,
    }));

    expect(normalizeServiceQuoteLines(lines)).toBeNull();
    expect(calculateServiceQuoteTotals(lines, 0.14975, 30)).toBeNull();
  });

  it.each([
    ["fractional quantity", [{ name: "Lunch", quantity: 1.5, unitPrice: 12 }]],
    ["fractional cent", [{ name: "Lunch", quantity: 1, unitPrice: 12.345 }]],
    ["missing description", [{ name: "  ", quantity: 1, unitPrice: 12 }]],
    ["non-string description", [{ name: "Lunch", description: 123, quantity: 1, unitPrice: 12 }]],
  ])("rejects %s instead of silently changing the quoted line", (_label, lines) => {
    expect(normalizeServiceQuoteLines(lines)).toBeNull();
  });
});
