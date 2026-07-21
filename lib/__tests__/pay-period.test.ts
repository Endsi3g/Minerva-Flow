import { describe, expect, it } from "vitest";
import { getPayPeriodRange } from "@/lib/pay-period";

// A Wednesday, deliberately not a Monday/Sunday, to catch off-by-one
// week-boundary bugs that a start-of-week reference date would hide.
const WEDNESDAY = new Date("2026-07-22T12:00:00");

describe("getPayPeriodRange", () => {
  it("week: Monday-Sunday containing the reference date", () => {
    expect(getPayPeriodRange("week", WEDNESDAY)).toEqual({ start: "2026-07-20", end: "2026-07-26" });
  });

  it("biweekly: 14 days ending on the current week's Sunday", () => {
    expect(getPayPeriodRange("biweekly", WEDNESDAY)).toEqual({ start: "2026-07-13", end: "2026-07-26" });
  });

  it("month: calendar month containing the reference date", () => {
    expect(getPayPeriodRange("month", WEDNESDAY)).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });

  it("week: a Sunday reference date belongs to the week that started the previous Monday", () => {
    const sunday = new Date("2026-07-26T12:00:00");
    expect(getPayPeriodRange("week", sunday)).toEqual({ start: "2026-07-20", end: "2026-07-26" });
  });

  it("month: handles a 30-day month (no Sept 31st)", () => {
    const sept = new Date("2026-09-15T12:00:00");
    expect(getPayPeriodRange("month", sept)).toEqual({ start: "2026-09-01", end: "2026-09-30" });
  });
});
