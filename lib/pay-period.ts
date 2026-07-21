export type PayPeriod = "week" | "biweekly" | "month";

/**
 * Pure date math, no query — Monday-based week, matching the convention
 * already used by HoraireView/getUpcomingShiftsForEmployee. Biweekly is
 * the 14-day span ending on the current week's Sunday (last week + this
 * week); month is the calendar month containing `reference`.
 *
 * Kept in its own module (no imports) rather than inline in
 * lib/data/employees.ts so it can be unit-tested with Vitest — that file
 * transitively imports "server-only" (via lib/data/finance.ts), which
 * throws when imported outside a Next.js Server Component context, same
 * class of issue documented for lib/tokens.ts.
 */
export function getPayPeriodRange(period: PayPeriod, reference = new Date()): { start: string; end: string } {
  const day = reference.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  if (period === "month") {
    const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }

  const start = new Date(monday);
  if (period === "biweekly") start.setDate(start.getDate() - 7);
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);

  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
