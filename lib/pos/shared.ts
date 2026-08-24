/**
 * Timezone math shared by every POS provider's daily-sales sync — moved out
 * of lib/pos/square.ts (where it originated) once lib/pos/lightspeed.ts
 * needed the exact same day-boundary logic.
 */

/** Offset (minutes) such that localTime = utcTime + offset, for the timezone at the given instant. */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {} as Record<string, string>);

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - date.getTime()) / 60000;
}

/** Start/end of a calendar day in the restaurant's local timezone, as UTC ISO strings. */
export function localDayRangeUtc(dateStr: string, timeZone: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const naiveUtc = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offsetMinutes = tzOffsetMinutes(new Date(naiveUtc), timeZone);
  const startUtc = naiveUtc - offsetMinutes * 60000;
  return { startAt: new Date(startUtc).toISOString(), endAt: new Date(startUtc + 86_400_000).toISOString() };
}

/** Today's date in a given timezone, as YYYY-MM-DD — used by webhook handlers. */
export function todayInTimezone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
