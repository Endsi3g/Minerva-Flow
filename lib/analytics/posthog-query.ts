import "server-only";

const API_HOST = "https://us.posthog.com";
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID || "575536";

export function isPostHogQueryConfigured(): boolean {
  return Boolean(process.env.POSTHOG_PERSONAL_API_KEY);
}

export type HogQLResult = {
  columns: string[];
  results: (string | number | null)[][];
};

/**
 * Runs a read-only HogQL query against this project's captured events.
 * Requires POSTHOG_PERSONAL_API_KEY (a Personal API key with insight:read /
 * query:read scopes) — distinct from NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
 * which is write-only for event ingestion and cannot read data back.
 * Returns null on any failure (missing key, network error, bad query) so
 * callers can render a clear "unavailable" state per section instead of
 * crashing the whole page.
 */
export async function runHogQL(query: string): Promise<HogQLResult | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.results) || !Array.isArray(data?.columns)) return null;
    return { columns: data.columns, results: data.results };
  } catch {
    return null;
  }
}

/** Runs a native PostHog insight query (e.g. RetentionQuery) rather than raw HogQL. */
export async function runInsightQuery<T = unknown>(query: Record<string, unknown>): Promise<T | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${API_HOST}/api/projects/${PROJECT_ID}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
