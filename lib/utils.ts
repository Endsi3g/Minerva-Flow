import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_TIMEZONE = "America/Montreal";

/**
 * App locale ("fr" | "en") or a BCP 47 tag to the tag used for Intl formatting.
 * French is the default, so formatters called without a locale behave as before.
 */
export function intlTag(locale?: string): "fr-CA" | "en-CA" {
  return locale === "en" || locale === "en-CA" ? "en-CA" : "fr-CA";
}

const formatterCache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function numberFormat(locale: string | undefined, key: string, options: Intl.NumberFormatOptions) {
  const tag = intlTag(locale);
  const cacheKey = `n:${tag}:${key}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag, options);
    formatterCache.set(cacheKey, formatter);
  }
  return formatter as Intl.NumberFormat;
}

function dateFormat(locale: string | undefined, key: string, options: Intl.DateTimeFormatOptions) {
  const tag = intlTag(locale);
  const cacheKey = `d:${tag}:${key}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, options);
    formatterCache.set(cacheKey, formatter);
  }
  return formatter as Intl.DateTimeFormat;
}

// minimumFractionDigits: 0 keeps whole amounts clean ("45 231 $"), while
// maximumFractionDigits: 2 preserves cents instead of rounding them away
// ("16,60 $" must never become "17 $").
export function formatCurrency(value: number, locale?: string) {
  return numberFormat(locale, "currency", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompact(value: number, locale?: string) {
  return numberFormat(locale, "compact", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Default lookback window for pages/AI context that fetch service days or
 * financial transactions without a user-picked range — bounds otherwise
 * unbounded queries to a rolling window instead of a restaurant's full
 * lifetime of data.
 */
export const DEFAULT_HISTORY_WINDOW_DAYS = 400; // ~13 months, enough for a YoY comparison

export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Parsed at UTC noon rather than local midnight: these formatters always
// render in the fixed DEFAULT_TIMEZONE regardless of where the process
// itself runs (Vercel functions, CI, a dev machine — any timezone), so
// parsing must be equally timezone-independent. Local-midnight parsing
// would shift the displayed day whenever the process's timezone differs
// from DEFAULT_TIMEZONE (e.g. a UTC server showing the previous evening
// in Montreal time for a date meant to mean "this calendar day").
// Some callers pass a full timestamptz value (e.g. customers.last_visit_at)
// instead of the plain "YYYY-MM-DD" this was designed for — appending
// "T12:00:00Z" to an already-complete ISO string produces an unparseable
// value ("...T19:00:00.000ZT12:00:00Z") and formatDate/formatDateFull throw
// RangeError: Invalid time value. Detect that case and parse as-is instead.
function parseCalendarDate(iso: string) {
  return iso.includes("T") ? new Date(iso) : new Date(iso + "T12:00:00Z");
}

export function formatDate(iso: string, locale?: string) {
  return dateFormat(locale, "short", { day: "numeric", month: "short", timeZone: DEFAULT_TIMEZONE }).format(parseCalendarDate(iso));
}

export function formatDateFull(iso: string, locale?: string) {
  return dateFormat(locale, "full", { day: "numeric", month: "long", year: "numeric", timeZone: DEFAULT_TIMEZONE }).format(
    parseCalendarDate(iso),
  );
}

export function formatDateWeekday(iso: string, locale?: string) {
  const s = dateFormat(locale, "weekday", { weekday: "long", day: "numeric", month: "long", timeZone: DEFAULT_TIMEZONE }).format(
    parseCalendarDate(iso),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDelta(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatTime(iso: string, locale?: string) {
  return dateFormat(locale, "time", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Rounds to the nearest cent — avoids floating-point drift on money math (tax/tip calculations). */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Formats a timestamptz as a short relative time ("il y a 12 min" / "12 min ago"),
 * used for connection sync status. Falls back to a full date beyond a week.
 */
export function formatRelativeTime(iso: string, locale?: string) {
  const en = intlTag(locale) === "en-CA";
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return en ? "just now" : "à l'instant";
  if (minutes < 60) return en ? `${minutes} min ago` : `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return en ? `${hours} h ago` : `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return en ? "yesterday" : "hier";
  if (days < 7) return en ? `${days} days ago` : `il y a ${days} jours`;
  return formatDate(iso.slice(0, 10), locale);
}
