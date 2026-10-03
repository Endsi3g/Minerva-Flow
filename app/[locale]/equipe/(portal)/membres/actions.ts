"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import {
  addContentLink,
  deleteContentLink,
  saveCheckin,
  saveGithubLogin,
  type WriteResult,
} from "@/lib/team/profile-writes";

const DENIED: WriteResult = { ok: false, error: "Accès refusé." };

async function session() {
  const access = await getTeamPortalAccess();
  if (!access) return null;
  return { access, supabase: await createClient() };
}

function refresh() {
  revalidatePath("/[locale]/equipe/membres/[id]", "page");
}

// GitHub link and weekly check-ins are employee-only (RLS enforces it too).
export async function saveGithubAction(login: string): Promise<WriteResult> {
  const s = await session();
  if (!s?.access.isTeamMember) return DENIED;
  const result = await saveGithubLogin(s.supabase, s.access.userId, login);
  if (result.ok) refresh();
  return result;
}

export async function saveCheckinAction(commitments: string, delivered: string): Promise<WriteResult> {
  const s = await session();
  if (!s?.access.isTeamMember) return DENIED;
  const result = await saveCheckin(s.supabase, s.access.userId, commitments, delivered);
  if (result.ok) refresh();
  return result;
}

// Declared content is open to employees and active ambassadors.
export async function addContentLinkAction(url: string, title: string): Promise<WriteResult> {
  const s = await session();
  if (!s) return DENIED;
  const result = await addContentLink(s.supabase, s.access.userId, { url, title });
  if (result.ok) refresh();
  return result;
}

export async function deleteContentLinkAction(id: string): Promise<WriteResult> {
  const s = await session();
  if (!s) return DENIED;
  const result = await deleteContentLink(s.supabase, s.access.userId, id);
  if (result.ok) refresh();
  return result;
}
