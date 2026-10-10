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

export type OnboardingFunnelStep = {
  step: number;
  name: string;
  label: string;
  count: number;
  conversionFromFirst: number;
  conversionFromPrev: number;
  dropoffRate: number;
};

export type OnboardingFunnelData = {
  totalStarted: number;
  totalCompleted: number;
  overallConversionRate: number;
  steps: OnboardingFunnelStep[];
};

/**
 * 5-screen onboarding funnel. Counts distinct PEOPLE (not events: going back
 * and forth, or the server and the browser both reporting completion, would
 * otherwise inflate it) and groups by `visual_position`, the screen's place
 * in the order the person actually saw. Screens 1 (profile) and 5 (launch)
 * are fixed; screens 2 to 4 are qualification, program and offer in the
 * `classic` order, or offer, qualification and program in `offer-first`
 * (A/B flag `onboarding-step-order`).
 */
export async function getOnboardingFunnel(days = 30): Promise<OnboardingFunnelData | null> {
  const result = await runHogQL(`
    SELECT
      uniqIf(person_id, event = 'onboarding_step_viewed' AND JSONExtractInt(properties, 'visual_position') = 1) AS step_1_viewed,
      uniqIf(person_id, event = 'onboarding_step_completed' AND JSONExtractInt(properties, 'visual_position') = 1) AS step_1_completed,
      uniqIf(person_id, event = 'onboarding_step_completed' AND JSONExtractInt(properties, 'visual_position') = 2) AS step_2_completed,
      uniqIf(person_id, event = 'onboarding_step_completed' AND JSONExtractInt(properties, 'visual_position') = 3) AS step_3_completed,
      uniqIf(person_id, event = 'onboarding_step_completed' AND JSONExtractInt(properties, 'visual_position') = 4) AS step_4_completed,
      uniqIf(person_id, event = 'onboarding_step_completed' AND JSONExtractInt(properties, 'visual_position') = 5) AS step_5_completed,
      uniqIf(person_id, event = 'onboarding_completed') AS completed
    FROM events
    WHERE timestamp >= now() - INTERVAL ${days} DAY
  `);
  if (!result || !result.results[0]) return null;

  const [s1v, s1c, s2c, s3c, s4c, s5c, completed] = result.results[0].map(Number);
  const base = Math.max(s1v, s1c, 1);

  const rawSteps = [
    { step: 1, name: "profil_etablissement", label: "Écran 1 · Profil établissement", count: s1c },
    { step: 2, name: "ecran_2", label: "Écran 2 · Qualification ou offre", count: s2c },
    { step: 3, name: "ecran_3", label: "Écran 3 · Programme, qualification ou offre", count: s3c },
    { step: 4, name: "ecran_4", label: "Écran 4 · Offre ou programme", count: s4c },
    { step: 5, name: "lancement_final", label: "Écran 5 · Lancement", count: s5c },
    { step: 6, name: "onboarding_completed", label: "Complété (Compte Actif)", count: completed },
  ];

  const steps: OnboardingFunnelStep[] = rawSteps.map((s, idx) => {
    const prevCount = idx === 0 ? base : rawSteps[idx - 1].count;
    const convFromFirst = base > 0 ? Math.round((s.count / base) * 1000) / 10 : 0;
    const convFromPrev = prevCount > 0 ? Math.min(100, Math.round((s.count / prevCount) * 1000) / 10) : 0;
    const dropoff = Math.max(0, Math.round((100 - convFromPrev) * 10) / 10);
    return {
      step: s.step,
      name: s.name,
      label: s.label,
      count: s.count,
      conversionFromFirst: convFromFirst,
      conversionFromPrev: convFromPrev,
      dropoffRate: dropoff,
    };
  });

  return {
    totalStarted: base,
    totalCompleted: completed,
    overallConversionRate: base > 0 ? Math.round((completed / base) * 1000) / 10 : 0,
    steps,
  };
}
