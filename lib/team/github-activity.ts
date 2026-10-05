import "server-only";

import { toMontrealDate } from "@/lib/team/contributions";

export type GithubCommitDay = { login: string; date: string };

const REPO = process.env.GITHUB_ACTIVITY_REPO ?? "Endsi3g/Minerva-Flow";
const MAX_PAGES = 10; // 1 000 commits per refresh — far above 26 weeks of activity here.

type CommitPayload = {
  author: { login?: string } | null;
  commit: { author: { date: string } | null };
};

/**
 * Commits since `sinceIso`, one entry per commit linked to a GitHub account.
 * The repo is public, so this works without a token; GITHUB_ACTIVITY_TOKEN
 * (read-only, optional) only lifts the anonymous 60 requests/hour limit.
 * Returns null — never throws — when GitHub is unreachable or rate-limited,
 * so profiles show "GitHub indisponible" instead of an empty graph passed
 * off as zero activity.
 */
export async function fetchGithubCommitDays(sinceIso: string): Promise<GithubCommitDay[] | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_ACTIVITY_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_ACTIVITY_TOKEN}`;

  const commits: GithubCommitDay[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `https://api.github.com/repos/${REPO}/commits?since=${encodeURIComponent(sinceIso)}&per_page=100&page=${page}`;
      const res = await fetch(url, { headers, next: { revalidate: 3600 } });
      if (!res.ok) return null;
      const batch = (await res.json()) as CommitPayload[];
      for (const item of batch) {
        const login = item.author?.login;
        const date = item.commit.author?.date;
        if (login && date) commits.push({ login: login.toLowerCase(), date: toMontrealDate(date) });
      }
      if (batch.length < 100) break;
    }
  } catch {
    return null;
  }
  return commits;
}
