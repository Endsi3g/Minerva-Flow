export type ContributionSource = "github" | "referral" | "ugc" | "content" | "checkin";

export const CONTRIBUTION_SOURCES: { key: ContributionSource; label: string }[] = [
  { key: "github", label: "Commits GitHub" },
  { key: "referral", label: "Recommandations" },
  { key: "ugc", label: "Contenus UGC soumis" },
  { key: "content", label: "Contenus publiés" },
  { key: "checkin", label: "Bilans hebdomadaires" },
];

export type ContributionEvent = { date: string; source: ContributionSource };

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export type HeatmapDay = {
  date: string; // YYYY-MM-DD, Montréal calendar day
  count: number;
  level: HeatmapLevel;
  future: boolean;
  bySource: Partial<Record<ContributionSource, number>>;
};

export type Heatmap = {
  weeks: number;
  /** Monday-first, `weeks * 7` entries, oldest first. */
  days: HeatmapDay[];
  total: number;
  bySource: Record<ContributionSource, number>;
};

export const HEATMAP_WEEKS = 26;
const TIME_ZONE = "America/Toronto";

/** Calendar day in Montréal, not UTC: a 9 pm commit belongs to that evening. */
export function toMontrealDate(input: string | Date): string {
  return new Date(input).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(ymd: string, days: number): string {
  const date = parseYmd(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return formatYmd(date);
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
function isoWeekday(ymd: string): number {
  const dow = parseYmd(ymd).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function mondayOf(ymd: string): string {
  return addDays(ymd, -(isoWeekday(ymd) - 1));
}

export function levelFor(count: number): HeatmapLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

export function emptyBySource(): Record<ContributionSource, number> {
  return { github: 0, referral: 0, ugc: 0, content: 0, checkin: 0 };
}

/** First day shown by buildHeatmap: use it as the lower bound when querying sources. */
export function heatmapStart(today: string = toMontrealDate(new Date()), weeks = HEATMAP_WEEKS): string {
  return addDays(mondayOf(today), -(weeks - 1) * 7);
}

export function buildHeatmap(
  events: ContributionEvent[],
  today: string = toMontrealDate(new Date()),
  weeks = HEATMAP_WEEKS
): Heatmap {
  const start = heatmapStart(today, weeks);
  const perDay = new Map<string, Partial<Record<ContributionSource, number>>>();
  const bySource = emptyBySource();
  let total = 0;

  for (const event of events) {
    if (event.date < start || event.date > today) continue;
    const day = perDay.get(event.date) ?? {};
    day[event.source] = (day[event.source] ?? 0) + 1;
    perDay.set(event.date, day);
    bySource[event.source] += 1;
    total += 1;
  }

  const days: HeatmapDay[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(start, i);
    const sources = perDay.get(date) ?? {};
    const count = Object.values(sources).reduce((sum, n) => sum + (n ?? 0), 0);
    days.push({ date, count, level: levelFor(count), future: date > today, bySource: sources });
  }

  return { weeks, days, total, bySource };
}
