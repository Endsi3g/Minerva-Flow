import "server-only";

const USER_AGENT = "MinervaMenuBot";

/**
 * Minimal robots.txt check — not a full RFC 9309 implementation, just enough
 * to respect an explicit "don't scrape me" on independent restaurant sites,
 * matching the same ethical default the rest of this feature holds to.
 * Delivery-platform scraping deliberately skips this — see fetch-menu.ts.
 */
export async function isAllowedByRobotsTxt(targetUrl: string): Promise<boolean> {
  try {
    const url = new URL(targetUrl);
    const robotsUrl = `${url.origin}/robots.txt`;
    const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return true; // no robots.txt (or unreachable) => nothing disallowed
    const body = await res.text();
    return isPathAllowed(body, url.pathname);
  } catch {
    return true; // fail open — a broken robots.txt fetch shouldn't block a real request
  }
}

function isPathAllowed(robotsTxt: string, path: string): boolean {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim());
  let inRelevantGroup = false;
  let matchedSpecificAgent = false;
  const disallowed: string[] = [];

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      if (agent === "*") {
        inRelevantGroup = !matchedSpecificAgent;
      } else if (agent === USER_AGENT.toLowerCase()) {
        matchedSpecificAgent = true;
        inRelevantGroup = true;
        disallowed.length = 0; // a specific-agent block overrides the wildcard one
      } else {
        inRelevantGroup = false;
      }
      continue;
    }

    if (inRelevantGroup && key === "disallow" && value) {
      disallowed.push(value);
    }
  }

  return !disallowed.some((rule) => path.startsWith(rule));
}
