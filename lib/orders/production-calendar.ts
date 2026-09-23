export function getRestaurantDateKey(value: Date | string, timeZone: string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
    const year = part("year");
    const month = part("month");
    const day = part("day");
    return year && month && day ? `${year}-${month}-${day}` : null;
  } catch {
    return null;
  }
}

export function addCalendarDays(dateKey: string, amount: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match || !Number.isInteger(amount)) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) return null;
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function formatCalendarDay(dateKey: string, timeZone: string, options: Intl.DateTimeFormatOptions = {}): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  try {
    return new Intl.DateTimeFormat("fr-CA", { ...options, timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat("fr-CA", { ...options, timeZone: "UTC" }).format(date);
  }
}

export function formatCalendarTime(value: string, timeZone: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Heure à confirmer";
  try {
    return new Intl.DateTimeFormat("fr-CA", { hour: "2-digit", minute: "2-digit", timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat("fr-CA", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(date);
  }
}
