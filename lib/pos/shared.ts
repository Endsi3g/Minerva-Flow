import { getRestaurantDateWindow } from "../orders/scheduling";

/**
 * Timezone math shared by every POS provider's daily-sales sync — moved out
 * of lib/pos/square.ts (where it originated) once lib/pos/lightspeed.ts
 * needed the exact same day-boundary logic.
 */

/** Start/end of a calendar day in the restaurant's local timezone, as UTC ISO strings. */
export function localDayRangeUtc(dateStr: string, timeZone: string) {
  const { start, end } = getRestaurantDateWindow(dateStr, timeZone);
  return { startAt: start, endAt: end };
}

/** Today's date in a given timezone, as YYYY-MM-DD — used by webhook handlers. */
export function todayInTimezone(timeZone: string): string {
  let zone = timeZone;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
  } catch {
    zone = "America/Toronto";
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
