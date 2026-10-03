/**
 * The opt-in "Fréquent" notification level. A customer who chooses it gets
 * reminders far more often than the default (about every few days), but never
 * unbounded: a daily cap, a minimum gap, and quiet hours. Push only, and only
 * for customers who gave marketing consent (enforced by the engine).
 */
export const FREQUENT_MAX_PER_DAY = 2;
export const FREQUENT_MIN_GAP_HOURS = 4;
/** Local (Montréal) hours during which a frequent message may be sent: 9:00 to 19:59. */
export const QUIET_HOURS_START = 9;
export const QUIET_HOURS_END = 20;

const HOUR = 3_600_000;

/** Hour of day (0-23) in Montréal for `now`. */
export function montrealHour(now: Date): number {
  const hour = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(hour);
}

export function isWithinSendingHours(now: Date): boolean {
  const hour = montrealHour(now);
  return hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END;
}

/**
 * `sentAt` are the timestamps (ISO) of this customer's previous retention
 * sends. Eligible when we are inside sending hours, fewer than the daily cap
 * went out in the last 24 hours, and the last one is at least the minimum gap ago.
 */
export function isFrequentEligible(sentAt: string[], now: Date): boolean {
  if (!isWithinSendingHours(now)) return false;
  const times = sentAt.map((value) => new Date(value).getTime()).filter((time) => Number.isFinite(time));
  const last24h = times.filter((time) => now.getTime() - time < 24 * HOUR);
  if (last24h.length >= FREQUENT_MAX_PER_DAY) return false;
  const latest = Math.max(0, ...times);
  return now.getTime() - latest >= FREQUENT_MIN_GAP_HOURS * HOUR;
}

/** Deterministic pick so a customer does not get the same wording every time. */
export function pickVariant<T>(variants: readonly T[], seed: string, now: Date): T {
  let hash = 0;
  for (const character of `${seed}:${Math.floor(now.getTime() / (HOUR * 4))}`) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return variants[hash % variants.length];
}
