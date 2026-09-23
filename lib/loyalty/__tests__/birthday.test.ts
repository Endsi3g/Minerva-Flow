import { describe, expect, it } from "vitest";
import { getDaysUntilBirthday } from "../birthday";

describe("getDaysUntilBirthday", () => {
  it("uses the restaurant timezone when selecting today", () => {
    const now = new Date("2026-06-19T02:00:00.000Z"); // June 18 in Toronto
    expect(getDaysUntilBirthday("1994-06-18", now, "America/Toronto")).toBe(0);
    expect(getDaysUntilBirthday("1994-06-18", now, "UTC")).toBe(364);
  });

  it("celebrates February 29 on February 28 in non-leap years", () => {
    expect(getDaysUntilBirthday("2000-02-29", new Date("2025-02-28T12:00:00Z"), "UTC")).toBe(0);
    expect(getDaysUntilBirthday("2000-02-29", new Date("2024-02-29T12:00:00Z"), "UTC")).toBe(0);
  });

  it("returns null for missing or malformed birthday dates", () => {
    expect(getDaysUntilBirthday(null)).toBeNull();
    expect(getDaysUntilBirthday("2026-02-30")).toBeNull();
    expect(getDaysUntilBirthday("06/18/1994")).toBeNull();
  });
});
