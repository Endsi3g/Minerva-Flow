import type { SupabaseClient } from "@supabase/supabase-js";
import { mondayOf, toMontrealDate } from "@/lib/team/contributions";

export type WriteResult = { ok: true } | { ok: false; error: string };

export const GITHUB_LOGIN_RE = /^[A-Za-z0-9-]{1,39}$/;
export const CONTENT_PLATFORMS = ["instagram", "tiktok", "youtube", "linkedin", "facebook", "other"] as const;
export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number];

const HOST_TO_PLATFORM: [RegExp, ContentPlatform][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "youtube"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.watch$/, "facebook"],
];

export function detectPlatform(hostname: string): ContentPlatform {
  const host = hostname.toLowerCase();
  return HOST_TO_PLATFORM.find(([pattern]) => pattern.test(host))?.[1] ?? "other";
}

export type ContentLinkInput = { url: string; title?: string };

export function validateContentLink(
  input: ContentLinkInput
): { ok: true; value: { url: string; platform: ContentPlatform; title: string } } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(input.url.trim());
  } catch {
    return { ok: false, error: "Lien invalide." };
  }
  if (parsed.protocol !== "https:") return { ok: false, error: "Le lien doit commencer par https://." };
  const url = parsed.toString();
  if (url.length > 500) return { ok: false, error: "Lien trop long." };
  const title = (input.title ?? "").trim();
  if (title.length > 160) return { ok: false, error: "Titre trop long (160 caractères max)." };
  return { ok: true, value: { url, platform: detectPlatform(parsed.hostname), title } };
}

/** Empty login unlinks the account. */
export async function saveGithubLogin(client: SupabaseClient, userId: string, login: string): Promise<WriteResult> {
  const clean = login.trim().replace(/^@/, "");
  if (clean === "") {
    const { error } = await client.from("team_member_github").delete().eq("user_id", userId);
    return error ? { ok: false, error: "Échec de la mise à jour." } : { ok: true };
  }
  if (!GITHUB_LOGIN_RE.test(clean)) return { ok: false, error: "Identifiant GitHub invalide." };
  const { error } = await client
    .from("team_member_github")
    .upsert({ user_id: userId, github_login: clean, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error?.code === "23505") return { ok: false, error: "Cet identifiant GitHub est déjà lié à un autre compte." };
  return error ? { ok: false, error: "Échec de la mise à jour." } : { ok: true };
}

/** One check-in per person per week (Monday-based, Montréal time); saving again edits it. */
export async function saveCheckin(client: SupabaseClient, userId: string, commitments: string, delivered: string): Promise<WriteResult> {
  const a = commitments.trim();
  const b = delivered.trim();
  if (a === "" && b === "") return { ok: false, error: "Écrivez au moins une ligne." };
  if (a.length > 2000 || b.length > 2000) return { ok: false, error: "Texte trop long (2 000 caractères max)." };
  const { error } = await client.from("team_weekly_checkins").upsert(
    { user_id: userId, week_start: mondayOf(toMontrealDate(new Date())), commitments: a, delivered: b, updated_at: new Date().toISOString() },
    { onConflict: "user_id,week_start" }
  );
  return error ? { ok: false, error: "Échec de l’enregistrement." } : { ok: true };
}

export async function addContentLink(client: SupabaseClient, userId: string, input: ContentLinkInput): Promise<WriteResult> {
  const checked = validateContentLink(input);
  if (!checked.ok) return checked;
  const { error } = await client.from("team_content_links").insert({
    user_id: userId,
    url: checked.value.url,
    platform: checked.value.platform,
    title: checked.value.title,
  });
  return error ? { ok: false, error: "Échec de l’ajout." } : { ok: true };
}

export async function deleteContentLink(client: SupabaseClient, userId: string, id: string): Promise<WriteResult> {
  const { error } = await client.from("team_content_links").delete().eq("id", id).eq("user_id", userId);
  return error ? { ok: false, error: "Échec de la suppression." } : { ok: true };
}
