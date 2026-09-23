import { describe, expect, it } from "vitest";
import { formatRestaurantTime, getRestaurantDayWindow, resolveRestaurantLocalDateTime, validateRequestedReadyAt } from "../scheduling";

describe("restaurant-local preorder scheduling", () => {
  it("resolves a local time using the restaurant timezone rather than the server timezone", () => {
    expect(resolveRestaurantLocalDateTime("2026-01-15T12:30", "America/Toronto")?.toISOString())
      .toBe("2026-01-15T17:30:00.000Z");
  });

  it("rejects nonexistent daylight-saving times", () => {
    expect(resolveRestaurantLocalDateTime("2026-03-08T02:30", "America/Toronto")).toBeNull();
  });

  it("rejects ambiguous repeated times when daylight saving time ends", () => {
    expect(resolveRestaurantLocalDateTime("2026-11-01T01:30", "America/Toronto")).toBeNull();
    expect(validateRequestedReadyAt("2026-11-01T01:30", "America/Toronto", new Date("2026-10-30T12:00:00Z")))
      .toMatchObject({ ok: false, reason: "invalid_local_time" });
  });

  it("accepts only quarter-hour slots within the lead and booking windows", () => {
    const now = new Date("2026-01-15T16:00:00.000Z");
    expect(validateRequestedReadyAt("2026-01-15T11:15", "America/Toronto", now).ok).toBe(true);
    expect(validateRequestedReadyAt("2026-01-15T11:10", "America/Toronto", now)).toMatchObject({ ok: false, reason: "invalid_interval" });
    expect(validateRequestedReadyAt("2026-01-15T11:00", "America/Toronto", now)).toMatchObject({ ok: false, reason: "too_soon" });
    expect(validateRequestedReadyAt("2026-02-20T12:00", "America/Toronto", now)).toMatchObject({ ok: false, reason: "too_far" });
  });

  it("validates absolute mobile timestamps against the restaurant-local quarter-hour", () => {
    const now = new Date("2026-01-15T16:00:00.000Z");
    expect(validateRequestedReadyAt("2026-01-15T16:30:00.000Z", "America/Toronto", now)).toMatchObject({
      ok: true,
      requestedReadyAt: "2026-01-15T16:30:00.000Z",
    });
    expect(validateRequestedReadyAt("2026-01-15T16:37:00.000Z", "America/Toronto", now)).toMatchObject({
      ok: false,
      reason: "invalid_interval",
    });
  });

  it("formats ready times using the restaurant timezone, not the device timezone", () => {
    expect(formatRestaurantTime("2026-01-15T17:30:00.000Z", "America/Toronto")).toContain("12");
    expect(formatRestaurantTime("not-an-iso-date", "America/Toronto")).toBe("");
  });

  it("builds the restaurant's local day window across a DST transition", () => {
    const { start, end, nowMs } = getRestaurantDayWindow("America/Toronto", new Date("2026-03-08T16:00:00.000Z"));
    expect(start).toBe("2026-03-08T05:00:00.000Z");
    expect(end).toBe("2026-03-09T04:00:00.000Z");
    expect(Date.parse(end) - Date.parse(start)).toBe(23 * 60 * 60_000);
    expect(nowMs).toBe(Date.parse("2026-03-08T16:00:00.000Z"));
  });
});
