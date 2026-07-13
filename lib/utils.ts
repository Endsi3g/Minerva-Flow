import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_TIMEZONE = "America/Montreal";

const currencyFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
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

export function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso + "T00:00:00"));
}

export function formatDateFull(iso: string) {
  return dateFullFormatter.format(new Date(iso + "T00:00:00"));
}

export function formatDateWeekday(iso: string) {
  const s = dateWeekdayFormatter.format(new Date(iso + "T00:00:00"));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDelta(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
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
