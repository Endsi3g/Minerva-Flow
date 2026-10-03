import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildHeatmap,
  heatmapStart,
  toMontrealDate,
  type ContributionEvent,
  type Heatmap,
} from "@/lib/team/contributions";
import { fetchGithubCommitDays } from "@/lib/team/github-activity";

/** Already authenticated by the caller (cookie session or Bearer token). */
export type Viewer = { userId: string; isTeamMember: boolean };

export type GithubStatus = "ok" | "unavailable" | "not_linked";

export type MemberSummary = {
  id: string;
  name: string;
  initials: string;
  isTeamMember: boolean;
  githubLogin: string | null;
  githubStatus: GithubStatus;
  heatmap: Heatmap;
};

export type MemberContentLink = { id: string; url: string; platform: string; title: string; publishedOn: string };
export type MemberCheckin = { weekStart: string; commitments: string; delivered: string };

export type MemberProfile = MemberSummary & {
  isSelf: boolean;
  contentLinks: MemberContentLink[];
  checkins: MemberCheckin[];
};

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function nameOf(row: { full_name: string | null; email: string | null }): string {
  return row.full_name?.trim() || row.email?.split("@")[0] || "Membre";
}

async function buildSummaries(admin: SupabaseClient, ids: string[]): Promise<MemberSummary[]> {
  if (ids.length === 0) return [];

  const startYmd = heatmapStart();
  const sinceIso = new Date(Date.parse(`${startYmd}T00:00:00Z`) - 86_400_000).toISOString();

  const [profiles, githubRows, checkins, links, ambassadors] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, is_team_member").in("id", ids),
    admin.from("team_member_github").select("user_id, github_login").in("user_id", ids),
    admin.from("team_weekly_checkins").select("user_id, week_start").in("user_id", ids).gte("week_start", startYmd),
    admin.from("team_content_links").select("user_id, published_on").in("user_id", ids).gte("published_on", startYmd),
    admin.from("flow_ambassadors").select("id, user_id").in("user_id", ids),
  ]);

  const ambassadorIds = ((ambassadors.data ?? []) as { id: string; user_id: string }[]).map((a) => a.id);
  const userByAmbassador = new Map(((ambassadors.data ?? []) as { id: string; user_id: string }[]).map((a) => [a.id, a.user_id]));

  const [referrals, ugc] = ambassadorIds.length
    ? await Promise.all([
        admin.from("flow_ambassador_referrals").select("ambassador_id, created_at").in("ambassador_id", ambassadorIds).gte("created_at", sinceIso),
        admin.from("flow_ugc_submissions").select("ambassador_id, created_at").in("ambassador_id", ambassadorIds).gte("created_at", sinceIso),
      ])
    : [{ data: [] }, { data: [] }];

  const githubByUser = new Map(((githubRows.data ?? []) as { user_id: string; github_login: string }[]).map((r) => [r.user_id, r.github_login]));

  const events = new Map<string, ContributionEvent[]>(ids.map((id) => [id, []]));
  const push = (userId: string | undefined, event: ContributionEvent) => {
    if (userId) events.get(userId)?.push(event);
  };

  for (const row of (checkins.data ?? []) as { user_id: string; week_start: string }[]) push(row.user_id, { date: row.week_start, source: "checkin" });
  for (const row of (links.data ?? []) as { user_id: string; published_on: string }[]) push(row.user_id, { date: row.published_on, source: "content" });
  for (const row of (referrals.data ?? []) as { ambassador_id: string; created_at: string }[]) {
    push(userByAmbassador.get(row.ambassador_id), { date: toMontrealDate(row.created_at), source: "referral" });
  }
  for (const row of (ugc.data ?? []) as { ambassador_id: string; created_at: string }[]) {
    push(userByAmbassador.get(row.ambassador_id), { date: toMontrealDate(row.created_at), source: "ugc" });
  }

  // One GitHub round-trip for everyone, only when somebody linked a login.
  const anyLinked = githubByUser.size > 0;
  const commits = anyLinked ? await fetchGithubCommitDays(sinceIso) : [];
  if (commits) {
    const userByLogin = new Map([...githubByUser].map(([userId, login]) => [login.toLowerCase(), userId]));
    for (const commit of commits) push(userByLogin.get(commit.login), { date: commit.date, source: "github" });
  }

  return ((profiles.data ?? []) as { id: string; full_name: string | null; email: string | null; is_team_member: boolean }[]).map((profile) => {
    const login = githubByUser.get(profile.id) ?? null;
    const name = nameOf(profile);
    return {
      id: profile.id,
      name,
      initials: initialsOf(name),
      isTeamMember: profile.is_team_member,
      githubLogin: login,
      githubStatus: login === null ? "not_linked" : commits === null ? "unavailable" : "ok",
      heatmap: buildHeatmap(events.get(profile.id) ?? []),
    } satisfies MemberSummary;
  });
}

/** Team directory: employees only, alphabetical (deliberately not a ranking). */
export async function getTeamDirectory(viewer: Viewer): Promise<MemberSummary[] | null> {
  if (!viewer.isTeamMember) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("is_team_member", true);
  const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
  const members = await buildSummaries(admin, ids);
  return members.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Employees may open any employee profile; an ambassador only their own.
 * `id` may be the literal "me".
 */
export async function getMemberProfile(viewer: Viewer, id: string): Promise<MemberProfile | null> {
  const targetId = id === "me" ? viewer.userId : id;
  if (!viewer.isTeamMember && targetId !== viewer.userId) return null;

  const admin = createAdminClient();
  const [summary] = await buildSummaries(admin, [targetId]);
  if (!summary) return null;
  // An employee viewing someone else only sees employee profiles.
  if (targetId !== viewer.userId && !summary.isTeamMember) return null;

  const [links, checkins] = await Promise.all([
    admin.from("team_content_links").select("id, url, platform, title, published_on").eq("user_id", targetId).order("published_on", { ascending: false }).limit(10),
    admin.from("team_weekly_checkins").select("week_start, commitments, delivered").eq("user_id", targetId).order("week_start", { ascending: false }).limit(4),
  ]);

  return {
    ...summary,
    isSelf: targetId === viewer.userId,
    contentLinks: ((links.data ?? []) as { id: string; url: string; platform: string; title: string; published_on: string }[]).map((row) => ({
      id: row.id,
      url: row.url,
      platform: row.platform,
      title: row.title,
      publishedOn: row.published_on,
    })),
    checkins: ((checkins.data ?? []) as { week_start: string; commitments: string; delivered: string }[]).map((row) => ({
      weekStart: row.week_start,
      commitments: row.commitments,
      delivered: row.delivered,
    })),
  };
}
