import type { Customer } from "@/lib/types";

/**
 * Customers who haven't visited in `thresholdDays` (or never have) —
 * shared by the AI context snapshot (lib/ai/context.ts) and the retention
 * cron (app/api/cron/retention-engine) so both use the exact same signal.
 */
export function getInactiveCustomers(customers: Customer[], thresholdDays: number, now = Date.now()): Customer[] {
  const cutoff = now - thresholdDays * 86_400_000;
  return customers.filter((c) => !c.lastVisitAt || new Date(c.lastVisitAt).getTime() < cutoff);
}

/** Customer's birthday falls within the next `leadDays` days, ignoring year. */
export function getUpcomingBirthdays(customers: Customer[], leadDays: number, today = new Date()): Customer[] {
  const todayMonthDay = today.getMonth() * 100 + today.getDate();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + leadDays);
  const endMonthDay = windowEnd.getMonth() * 100 + windowEnd.getDate();
  const wrapsYear = endMonthDay < todayMonthDay;

  return customers.filter((c) => {
    if (!c.birthday) return false;
    const [, month, day] = c.birthday.split("-").map(Number);
    const monthDay = (month - 1) * 100 + day;
    return wrapsYear
      ? monthDay >= todayMonthDay || monthDay <= endMonthDay
      : monthDay >= todayMonthDay && monthDay <= endMonthDay;
  });
}

/** Minimum number of logged visits before a customer's average gap is meaningful. */
const MIN_VISITS_FOR_DRIFT_SIGNAL = 3;
/** How many times over their own historical average gap counts as "drifting". */
const DRIFT_MULTIPLIER = 2;

/**
 * High-value customers whose current gap since their last visit has grown
 * well past their own historical average — catches someone slipping away
 * before they cross a blunt inactivity threshold. Distinct from
 * getInactiveCustomers: this is relative to each customer's own rhythm and
 * restricted to the restaurant's top-spending quartile, not everyone.
 */
export function getDriftingHighValueCustomers(customers: Customer[], now = Date.now()): Customer[] {
  const spenders = customers.filter((c) => c.totalSpent > 0);
  if (spenders.length < 4) return [];

  const sortedBySpend = [...spenders].sort((a, b) => b.totalSpent - a.totalSpent);
  const topQuartileCutoff = sortedBySpend[Math.floor(sortedBySpend.length / 4)].totalSpent;

  const result: Customer[] = [];
  for (const c of customers) {
    if (c.totalSpent < topQuartileCutoff) continue;

    const visits = c.transactions
      .filter((t) => t.type === "visite")
      .map((t) => new Date(t.createdAt).getTime())
      .sort((a, b) => a - b);
    if (visits.length < MIN_VISITS_FOR_DRIFT_SIGNAL) continue;

    const gaps: number[] = [];
    for (let i = 1; i < visits.length; i++) gaps.push((visits[i] - visits[i - 1]) / 86_400_000);
    const avgGapDays = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    if (avgGapDays <= 0) continue;

    const daysSinceLastVisit = (now - visits[visits.length - 1]) / 86_400_000;
    if (daysSinceLastVisit > avgGapDays * DRIFT_MULTIPLIER) result.push(c);
  }
  return result;
}

/**
 * Revenue from visits that happened within `windowDays` after a retention
 * nudge to that same customer — a direct, defensible "this visit followed
 * a message we sent" signal for the Overview "revenu incrémental" stat.
 * Deliberately not a stronger causal claim (a visit close after a send could
 * be coincidence) — see the AI system prompt's own rule against overstating
 * correlation as causation, applied here to a plain UI number too.
 */
export function getIncrementalRetentionRevenue(
  sends: { customerId: string; sentAt: string }[],
  customers: Customer[],
  windowDays = 14
): number {
  const sendTimesByCustomer = new Map<string, number[]>();
  for (const s of sends) {
    const list = sendTimesByCustomer.get(s.customerId) ?? [];
    list.push(new Date(s.sentAt).getTime());
    sendTimesByCustomer.set(s.customerId, list);
  }

  let total = 0;
  for (const c of customers) {
    const sendTimes = sendTimesByCustomer.get(c.id);
    if (!sendTimes || sendTimes.length === 0) continue;

    for (const tx of c.transactions) {
      if (tx.type !== "visite" || !tx.amountSpent) continue;
      const txTime = new Date(tx.createdAt).getTime();
      const followsASend = sendTimes.some((sendTime) => txTime >= sendTime && txTime <= sendTime + windowDays * 86_400_000);
      if (followsASend) total += tx.amountSpent;
    }
  }
  return Math.round(total * 100) / 100;
}
