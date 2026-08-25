import "server-only";

import { runHogQL, runInsightQuery, isPostHogQueryConfigured } from "@/lib/analytics/posthog-query";

export { isPostHogQueryConfigured };

export type DailyPoint = { date: string; value: number };

export type TrafficOverview = {
  uniqueVisitors: number;
  uniqueVisitorsDelta: number;
  pageviews: number;
  pageviewsDelta: number;
  sessions: number;
  sessionsDelta: number;
  visitorsSeries: DailyPoint[];
  pageviewsSeries: DailyPoint[];
  sessionsSeries: DailyPoint[];
};

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Daily unique visitors, pageviews and sessions over the last N days (default 14),
 * plus the % change of the most recent half vs. the previous half. */
export async function getTrafficOverview(days = 14): Promise<TrafficOverview | null> {
  const result = await runHogQL(`
    SELECT
      toDate(timestamp) AS day,
      count() AS pageviews,
      count(DISTINCT distinct_id) AS visitors,
      count(DISTINCT properties.$session_id) AS sessions
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY day
    ORDER BY day
  `);
  if (!result) return null;

  const byDay = new Map<string, { pageviews: number; visitors: number; sessions: number }>();
  for (const row of result.results) {
    const [day, pageviews, visitors, sessions] = row as [string, number, number, number];
    byDay.set(String(day).slice(0, 10), { pageviews, visitors, sessions });
  }

  const visitorsSeries: DailyPoint[] = [];
  const pageviewsSeries: DailyPoint[] = [];
  const sessionsSeries: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = byDay.get(key) ?? { pageviews: 0, visitors: 0, sessions: 0 };
    visitorsSeries.push({ date: key, value: row.visitors });
    pageviewsSeries.push({ date: key, value: row.pageviews });
    sessionsSeries.push({ date: key, value: row.sessions });
  }

  const half = Math.floor(days / 2);
  const sum = (arr: DailyPoint[]) => arr.reduce((s, p) => s + p.value, 0);
  const recentVisitors = sum(visitorsSeries.slice(-half));
  const priorVisitors = sum(visitorsSeries.slice(0, half));
  const recentPageviews = sum(pageviewsSeries.slice(-half));
  const priorPageviews = sum(pageviewsSeries.slice(0, half));
  const recentSessions = sum(sessionsSeries.slice(-half));
  const priorSessions = sum(sessionsSeries.slice(0, half));

  return {
    uniqueVisitors: sum(visitorsSeries),
    uniqueVisitorsDelta: pctDelta(recentVisitors, priorVisitors),
    pageviews: sum(pageviewsSeries),
    pageviewsDelta: pctDelta(recentPageviews, priorPageviews),
    sessions: sum(sessionsSeries),
    sessionsDelta: pctDelta(recentSessions, priorSessions),
    visitorsSeries,
    pageviewsSeries,
    sessionsSeries,
  };
}

export type BreakdownRow = { label: string; count: number };

export async function getCountryBreakdown(days = 14, limit = 8): Promise<BreakdownRow[] | null> {
  const result = await runHogQL(`
    SELECT properties.$geoip_country_name AS country, count(DISTINCT distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL ${days} DAY
      AND properties.$geoip_country_name IS NOT NULL
    GROUP BY country
    ORDER BY visitors DESC
    LIMIT ${limit}
  `);
  if (!result) return null;
  return result.results.map((r) => ({ label: String(r[0]), count: Number(r[1]) }));
}

export async function getBrowserBreakdown(days = 14, limit = 6): Promise<BreakdownRow[] | null> {
  const result = await runHogQL(`
    SELECT properties.$browser AS browser, count(DISTINCT distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL ${days} DAY
      AND properties.$browser IS NOT NULL
    GROUP BY browser
    ORDER BY visitors DESC
    LIMIT ${limit}
  `);
  if (!result) return null;
  return result.results.map((r) => ({ label: String(r[0]), count: Number(r[1]) }));
}

export async function getChannelBreakdown(days = 14): Promise<BreakdownRow[] | null> {
  const result = await runHogQL(`
    SELECT
      multiIf(
        properties.$referring_domain IS NULL OR properties.$referring_domain = '$direct', 'Direct',
        properties.$referring_domain LIKE '%google%' OR properties.$referring_domain LIKE '%bing%' OR properties.$referring_domain LIKE '%duckduckgo%', 'Recherche',
        properties.$referring_domain LIKE '%facebook%' OR properties.$referring_domain LIKE '%instagram%' OR properties.$referring_domain LIKE '%linkedin%' OR properties.$referring_domain LIKE '%twitter%' OR properties.$referring_domain LIKE '%tiktok%' OR properties.$referring_domain LIKE '%t.co%','Réseaux sociaux',
        'Référent'
      ) AS channel,
      count(DISTINCT distinct_id) AS visitors
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY channel
    ORDER BY visitors DESC
  `);
  if (!result) return null;
  return result.results.map((r) => ({ label: String(r[0]), count: Number(r[1]) }));
}

export type HeatmapCell = { day: number; hour: number; count: number };

/** day: 0 (Monday) .. 6 (Sunday), hour: 0..23 */
export async function getHourlyHeatmap(days = 28): Promise<HeatmapCell[] | null> {
  const result = await runHogQL(`
    SELECT toDayOfWeek(timestamp) AS dow, toHour(timestamp) AS hr, count() AS cnt
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY dow, hr
    ORDER BY dow, hr
  `);
  if (!result) return null;
  // ClickHouse's toDayOfWeek is 1 (Monday) .. 7 (Sunday) — normalize to 0..6.
  return result.results.map((r) => ({
    day: (Number(r[0]) - 1 + 7) % 7,
    hour: Number(r[1]),
    count: Number(r[2]),
  }));
}

export type RetentionCohort = {
  cohortLabel: string;
  /** Percent retained at each subsequent period, values[0] is always 100. */
  values: number[];
};

export async function getRetentionCohorts(): Promise<RetentionCohort[] | null> {
  const data = await runInsightQuery<{
    results?: { date: string; label: string; values: { count: number }[] }[];
  }>({
    kind: "RetentionQuery",
    retentionFilter: {
      targetEntity: { id: "$pageview", type: "events" },
      returningEntity: { id: "$pageview", type: "events" },
      retentionType: "retention_first_time",
      period: "Week",
      totalIntervals: 6,
    },
  });
  const rows = data?.results;
  if (!rows || rows.length === 0) return null;

  return rows.map((row) => {
    const base = row.values[0]?.count ?? 0;
    return {
      cohortLabel: row.label,
      values: row.values.map((v) => (base > 0 ? Math.round((v.count / base) * 1000) / 10 : 0)),
    };
  });
}
