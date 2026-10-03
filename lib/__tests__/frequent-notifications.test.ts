import { describe, expect, it } from "vitest";
import {
  FREQUENT_MAX_PER_DAY,
  isFrequentEligible,
  isWithinSendingHours,
  montrealHour,
  pickVariant,
} from "@/lib/retention/frequent";

// 2026-10-03 is EDT (UTC-4): 14:00 UTC = 10:00 in Montréal.
const at = (utc: string) => new Date(`2026-10-03T${utc}:00.000Z`);

describe("sending hours", () => {
  it("uses Montréal time, not UTC", () => {
    expect(montrealHour(at("14:00"))).toBe(10);
    expect(montrealHour(at("03:00"))).toBe(23);
  });

  it("allows 9:00 to 19:59 and blocks nights and early mornings", () => {
    expect(isWithinSendingHours(at("13:00"))).toBe(true); // 9:00
    expect(isWithinSendingHours(at("23:59"))).toBe(true); // 19:59
    expect(isWithinSendingHours(at("12:59"))).toBe(false); // 8:59
    expect(isWithinSendingHours(at("00:00"))).toBe(false); // 20:00
    expect(isWithinSendingHours(at("04:00"))).toBe(false); // midnight
  });
});

describe("isFrequentEligible", () => {
  const now = at("17:00"); // 13:00 Montréal

  it("sends to someone never contacted, inside hours", () => {
    expect(isFrequentEligible([], now)).toBe(true);
  });

  it("never sends outside sending hours, even to someone never contacted", () => {
    expect(isFrequentEligible([], at("06:00"))).toBe(false);
  });

  it("keeps a minimum gap between two messages", () => {
    expect(isFrequentEligible([at("15:00").toISOString()], now)).toBe(false); // 2h ago
    expect(isFrequentEligible([at("12:00").toISOString()], now)).toBe(true); // 5h ago
  });

  it("stops at the daily cap", () => {
    const sends = [at("09:00").toISOString(), at("13:00").toISOString()];
    expect(sends).toHaveLength(FREQUENT_MAX_PER_DAY);
    expect(isFrequentEligible(sends, now)).toBe(false);
  });

  it("lets yesterday's messages expire", () => {
    const yesterday = new Date(now.getTime() - 26 * 3_600_000).toISOString();
    expect(isFrequentEligible([yesterday, yesterday], now)).toBe(true);
  });
});

describe("pickVariant", () => {
  const variants = ["a", "b", "c"] as const;

  it("is stable within a window and always returns one of the variants", () => {
    const first = pickVariant(variants, "customer-1", at("17:00"));
    expect(pickVariant(variants, "customer-1", at("17:30"))).toBe(first);
    expect(variants).toContain(first);
  });

  it("rotates the wording across time windows", () => {
    const seen = new Set<string>();
    for (let hours = 0; hours < 48; hours += 4) {
      seen.add(pickVariant(variants, "customer-1", new Date(at("00:00").getTime() + hours * 3_600_000)));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
