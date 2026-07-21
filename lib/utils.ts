import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_TIMEZONE = "America/Montreal";

// minimumFractionDigits: 0 keeps whole amounts clean ("45 231 $"), while
// maximumFractionDigits: 2 preserves cents instead of rounding them away
// ("16,60 $" must never become "17 $").
const currencyFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("fr-CA", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

const dateFormatter = new Intl.DateTimeFormat("fr-CA", {
  day: "numeric",
  month: "short",
  timeZone: DEFAULT_TIMEZONE,
});

const dateFullFormatter = new Intl.DateTimeFormat("fr-CA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: DEFAULT_TIMEZONE,
});

const dateWeekdayFormatter = new Intl.DateTimeFormat("fr-CA", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: DEFAULT_TIMEZONE,
});

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
function parseCalendarDate(iso: string) {
  return new Date(iso + "T12:00:00Z");
}

export function formatDate(iso: string) {
  return dateFormatter.format(parseCalendarDate(iso));
}

export function formatDateFull(iso: string) {
  return dateFullFormatter.format(parseCalendarDate(iso));
}

export function formatDateWeekday(iso: string) {
  const s = dateWeekdayFormatter.format(parseCalendarDate(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDelta(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

const timeFormatter = new Intl.DateTimeFormat("fr-CA", { hour: "2-digit", minute: "2-digit" });

export function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}

/** Rounds to the nearest cent — avoids floating-point drift on money math (tax/tip calculations). */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Formats a timestamptz as a short French relative time ("il y a 12 min"),
 * used for connection sync status. Falls back to a full date beyond a day.
 */
export function formatRelativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return formatDate(iso.slice(0, 10));
}
