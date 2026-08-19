import "server-only";
import { isAllowedByRobotsTxt } from "../scrape/robots";
import type { AuditCheck, AuditCheckId, WebsiteAuditReport } from "./types";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MinervaMenuBot/1.0";

const ORDERING_HOSTS = ["ubereats.com", "doordash.com", "skipthedishes.com", "menu.ca", "ritual.co"];
const RESERVATION_HOSTS = ["opentable.", "resy.com", "exploretock.com", "sevenrooms.com", "tables.co"];
const SOCIAL_HOSTS = ["facebook.com", "instagram.com"];

const CHECK_WEIGHTS: Record<AuditCheckId, number> = {
  https: 10,
  speed: 10,
  mobileViewport: 10,
  seoBasics: 10,
  onlineMenu: 20,
  onlineOrdering: 15,
  onlineReservation: 15,
  clickablePhone: 5,
  socialLinks: 5,
};

function gradeFromScore(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

function scoreAndGrade(checks: AuditCheck[]): { score: number; grade: "A" | "B" | "C" | "D" } {
  const total = Object.values(CHECK_WEIGHTS).reduce((a, b) => a + b, 0);
  const earned = checks.reduce((sum, c) => sum + (c.passed ? CHECK_WEIGHTS[c.id] : 0), 0);
  const score = Math.round((earned / total) * 100);
  return { score, grade: gradeFromScore(score) };
}

function hasLinkTo(html: string, hosts: string[]): string | null {
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    for (const host of hosts) {
      if (href.includes(host)) return host;
    }
  }
  return null;
}

/**
 * Best-effort audit of a prospect's own web presence — one fetch, a handful
 * of cheap regex checks against the raw HTML, no headless browser, no
 * third-party API (matches the same "runs entirely in this app" constraint
 * as scrapeMenuFromUrl). Meant to back a sales pitch ("here's what your
 * current site is missing"), not to be a rigorous audit tool.
 *
 * Always returns a full report, even when the site can't be reached at all —
 * an unreachable site is itself a finding worth showing the prospect.
 */
export async function runWebsiteAudit(rawUrl: string): Promise<WebsiteAuditReport> {
  const fetchedAt = new Date().toISOString();
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return {
      url: rawUrl,
      fetchedAt,
      score: 0,
      grade: "D",
      checks: [],
      siteUnreachable: true,
    };
  }

  const httpsCheck: AuditCheck = { id: "https", passed: url.protocol === "https:" };

  const allowed = await isAllowedByRobotsTxt(url.toString());
  if (!allowed) {
    return {
      url: url.toString(),
      fetchedAt,
      score: 0,
      grade: "D",
      checks: [httpsCheck],
      siteUnreachable: true,
    };
  }

  let html: string;
  let responseTimeMs: number;
  try {
    const startedAt = Date.now();
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    responseTimeMs = Date.now() - startedAt;
    if (!res.ok) {
      return {
        url: url.toString(),
        fetchedAt,
        score: 0,
        grade: "D",
        checks: [httpsCheck],
        siteUnreachable: true,
      };
    }
    html = await res.text();
  } catch {
    return {
      url: url.toString(),
      fetchedAt,
      score: 0,
      grade: "D",
      checks: [httpsCheck],
      siteUnreachable: true,
    };
  }

  const checks: AuditCheck[] = [
    httpsCheck,
    {
      id: "speed",
      passed: responseTimeMs < 1500,
      detail: `${responseTimeMs} ms`,
    },
    {
      id: "mobileViewport",
      passed: /<meta[^>]+name=["']viewport["']/i.test(html),
    },
    {
      id: "seoBasics",
      passed: /<title>[^<]+<\/title>/i.test(html) && /<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(html),
    },
    {
      id: "onlineMenu",
      passed: /\bmenu\b|\bcarte\b/i.test(html) && /href=["'][^"']*menu[^"']*["']/i.test(html),
    },
    (() => {
      const host = hasLinkTo(html, ORDERING_HOSTS);
      return { id: "onlineOrdering" as const, passed: !!host, detail: host ?? undefined };
    })(),
    (() => {
      const host = hasLinkTo(html, RESERVATION_HOSTS);
      return { id: "onlineReservation" as const, passed: !!host, detail: host ?? undefined };
    })(),
    {
      id: "clickablePhone",
      passed: /href=["']tel:/i.test(html),
    },
    (() => {
      const host = hasLinkTo(html, SOCIAL_HOSTS);
      return { id: "socialLinks" as const, passed: !!host, detail: host ?? undefined };
    })(),
  ];

  const { score, grade } = scoreAndGrade(checks);

  return {
    url: url.toString(),
    fetchedAt,
    score,
    grade,
    checks,
  };
}
