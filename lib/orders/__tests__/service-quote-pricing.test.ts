import { describe, expect, it } from "vitest";
import { calculateServiceQuoteTotals } from "../service-quote-pricing";

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
});
