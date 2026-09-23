import { describe, expect, it } from "vitest";
import { localDayRangeUtc, todayInTimezone } from "../shared";

describe("POS restaurant-local day boundaries", () => {
  it("uses a 23-hour UTC range for Toronto's spring-forward day", () => {
    const range = localDayRangeUtc("2026-03-08", "America/Toronto");
    expect(range).toEqual({ startAt: "2026-03-08T05:00:00.000Z", endAt: "2026-03-09T04:00:00.000Z" });
    expect(Date.parse(range.endAt) - Date.parse(range.startAt)).toBe(23 * 60 * 60_000);
  });

  it("uses a 25-hour UTC range for Toronto's fall-back day", () => {
    const range = localDayRangeUtc("2026-11-01", "America/Toronto");
    expect(range).toEqual({ startAt: "2026-11-01T04:00:00.000Z", endAt: "2026-11-02T05:00:00.000Z" });
    expect(Date.parse(range.endAt) - Date.parse(range.startAt)).toBe(25 * 60 * 60_000);
  });

  it("rejects invalid dates and falls back safely for an invalid timezone", () => {
    expect(() => localDayRangeUtc("2026-02-30", "America/Toronto")).toThrow(RangeError);
    expect(localDayRangeUtc("2026-01-15", "invalid/timezone")).toEqual(
      localDayRangeUtc("2026-01-15", "America/Toronto")
    );
  });

  it("uses a safe timezone fallback when calculating the current POS sync day", () => {
    expect(todayInTimezone("invalid/timezone")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
