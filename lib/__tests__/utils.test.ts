import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDelta, roundToCents } from "@/lib/utils";

// Intl.NumberFormat("fr-CA") uses a non-breaking space (U+00A0) both as the
// thousands separator and before the currency symbol — visually
// indistinguishable from a regular space, but not byte-equal to one.
const NBSP = " ";

describe("formatCurrency", () => {
  it("formats whole amounts without decimals", () => {
    expect(formatCurrency(45231)).toBe(`45${NBSP}231${NBSP}$`);
  });

  it("keeps up to 2 decimal places instead of rounding them away", () => {
    expect(formatCurrency(16.66)).toBe(`16,66${NBSP}$`);
  });

  it("does not pad a single trailing decimal to two", () => {
    // minimumFractionDigits: 0 means a clean 16.6 stays "16,6 $", not "16,60 $".
    expect(formatCurrency(16.6)).toBe(`16,6${NBSP}$`);
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe(`0${NBSP}$`);
  });
});

describe("roundToCents", () => {
  it("avoids floating-point drift on money math", () => {
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
  });

  it("rounds to the nearest cent", () => {
    expect(roundToCents(19.995)).toBe(20);
    expect(roundToCents(19.994)).toBe(19.99);
  });
});

describe("formatDelta", () => {
  it("prefixes positive values with a plus sign", () => {
    expect(formatDelta(12.34)).toBe("+12.3%");
  });

  it("leaves negative values as-is", () => {
    expect(formatDelta(-5)).toBe("-5.0%");
  });

  it("does not add a plus sign for zero", () => {
    expect(formatDelta(0)).toBe("0.0%");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string in fr-CA short form", () => {
    // Day/month only — exact output depends on the fr-CA locale data bundled
    // with the runtime, so assert on the parts rather than a fixed string.
    const result = formatDate("2026-03-05");
    expect(result).toContain("5");
    expect(result.toLowerCase()).toContain("mars");
  });
});
