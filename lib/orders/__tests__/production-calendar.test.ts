import { describe, expect, it } from "vitest";
import { addCalendarDays, formatCalendarTime, getRestaurantDateKey } from "../production-calendar";

describe("production calendar helpers", () => {
  it("groups instants by the restaurant's local date", () => {
    expect(getRestaurantDateKey("2026-11-01T03:30:00.000Z", "America/Toronto")).toBe("2026-10-31");
    expect(getRestaurantDateKey("2026-11-01T05:30:00.000Z", "America/Toronto")).toBe("2026-11-01");
  });

  it("moves calendar dates safely across month, year, and DST boundaries", () => {
    expect(addCalendarDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addCalendarDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addCalendarDays("2026-03-08", -1)).toBe("2026-03-07");
  });

  it("rejects malformed calendar dates", () => {
    expect(addCalendarDays("2026-02-30", 1)).toBeNull();
    expect(addCalendarDays("not-a-date", 1)).toBeNull();
    expect(addCalendarDays("2026-03-08", 0.5)).toBeNull();
  });

  it("fails safely for invalid instants or timezone names", () => {
    expect(getRestaurantDateKey("invalid", "America/Toronto")).toBeNull();
    expect(getRestaurantDateKey("2026-03-08T12:00:00.000Z", "Invalid/Zone")).toBeNull();
    expect(formatCalendarTime("not-a-time", "America/Toronto")).toBe("Heure à confirmer");
    expect(formatCalendarTime("2026-03-08T12:00:00.000Z", "Invalid/Zone")).toMatch(/12.*00/);
  });
});
