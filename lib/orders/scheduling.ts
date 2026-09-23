export type ScheduleValidation = { ok: true; requestedReadyAt: string | null } | { ok: false; reason: string };

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

export function formatRestaurantTime(iso: string, timeZone: string, locale = "fr-CA"): string {
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
  try {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(instant);
  } catch {
    return new Intl.DateTimeFormat(locale, { ...options, timeZone: "America/Toronto" }).format(instant);
  }
}

export function getRestaurantDateWindow(localDate: string, timeZone: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) throw new RangeError("Restaurant day must be formatted as YYYY-MM-DD.");
  const [, year, month, day] = match.map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day) {
    throw new RangeError("Restaurant day is not a valid calendar date.");
  }

  let zone = timeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(parsedDate);
  } catch {
    zone = "America/Toronto";
  }

  const nextDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  const start = resolveRestaurantLocalDateTime(`${localDate}T00:00`, zone);
  const end = resolveRestaurantLocalDateTime(`${nextDate}T00:00`, zone);
  if (!start || !end) throw new RangeError(`Unable to resolve a restaurant day boundary for ${zone}.`);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getRestaurantDayWindow(timeZone: string, now = new Date()): { start: string; end: string; nowMs: number } {
  let zone = timeZone;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  } catch {
    zone = "America/Toronto";
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  }

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const today = `${String(get("year")).padStart(4, "0")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`;
  return { ...getRestaurantDateWindow(today, zone), nowMs: now.getTime() };
}

function parseLocalDateTime(value: string): LocalParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  ) return null;
  return { year, month, day, hour, minute };
}

function getZonedParts(date: Date, timeZone: string): LocalParts | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
  } catch {
    return null;
  }
}

/** Convert a restaurant-local datetime-local value to an unambiguous instant. */
export function resolveRestaurantLocalDateTime(value: string, timeZone: string): Date | null {
  const local = parseLocalDateTime(value);
  if (!local) return null;
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const possibleOffsets = new Set<number>();

  // Sample around the requested wall time so both offsets are considered
  // when a fall-back transition repeats the same local hour.
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const probe = localAsUtc + hours * 60 * 60_000;
    const zoned = getZonedParts(new Date(probe), timeZone);
    if (!zoned) return null;
    possibleOffsets.add(
      Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute) - probe
    );
  }

  const matches = [...possibleOffsets]
    .map((offset) => new Date(localAsUtc - offset))
    .filter((candidate) => {
      const check = getZonedParts(candidate, timeZone);
      return check && Object.keys(local).every((key) => check[key as keyof LocalParts] === local[key as keyof LocalParts]);
    });

  // A nonexistent spring-forward time has no matches; a repeated fall-back
  // time has two. Both must be selected explicitly instead of guessing.
  return matches.length === 1 ? matches[0] : null;
}

/** Enforces quarter-hour slots, a 15-minute lead time and a 30-day booking window. */
export function validateRequestedReadyAt(
  value: string | null | undefined,
  timeZone: string,
  now = new Date()
): ScheduleValidation {
  if (!value) return { ok: true, requestedReadyAt: null };
  const suppliedInstant = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? new Date(value) : null;
  const local = suppliedInstant && Number.isFinite(suppliedInstant.getTime())
    ? getZonedParts(suppliedInstant, timeZone)
    : parseLocalDateTime(value);
  if (!local) return { ok: false, reason: "invalid_datetime" };
  if (local.minute % 15 !== 0) return { ok: false, reason: "invalid_interval" };
  const instant = suppliedInstant && Number.isFinite(suppliedInstant.getTime())
    ? suppliedInstant
    : resolveRestaurantLocalDateTime(value, timeZone);
  if (!instant) return { ok: false, reason: "invalid_local_time" };
  const delta = instant.getTime() - now.getTime();
  if (delta < 15 * 60_000) return { ok: false, reason: "too_soon" };
  if (delta > 30 * 24 * 60 * 60_000) return { ok: false, reason: "too_far" };
  return { ok: true, requestedReadyAt: instant.toISOString() };
}
