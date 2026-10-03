import { NextResponse } from "next/server";
import { resolveNativeTeamAccess } from "@/lib/auth/native-team";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addContentLink,
  deleteContentLink,
  saveCheckin,
  saveGithubLogin,
  type WriteResult,
} from "@/lib/team/profile-writes";

type Body =
  | { kind: "github"; login: string }
  | { kind: "checkin"; commitments: string; delivered: string }
  | { kind: "content"; url: string; title?: string }
  | { kind: "deleteContent"; id: string };

/**
 * Writes to the caller's OWN profile only (userId comes from the token, never
 * from the body). GitHub link and check-ins are employee-only, like the RLS
 * policies they mirror; declared content is open to ambassadors too.
 */
export async function POST(req: Request) {
  const access = await resolveNativeTeamAccess(req);
  if (!access) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body.kind !== "string") return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const admin = createAdminClient();
  let result: WriteResult;
  switch (body.kind) {
    case "github":
      if (!access.isTeamMember) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      result = typeof body.login === "string" ? await saveGithubLogin(admin, access.userId, body.login) : { ok: false, error: "Requête invalide" };
      break;
    case "checkin":
      if (!access.isTeamMember) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      result =
        typeof body.commitments === "string" && typeof body.delivered === "string"
          ? await saveCheckin(admin, access.userId, body.commitments, body.delivered)
          : { ok: false, error: "Requête invalide" };
      break;
    case "content":
      result = typeof body.url === "string" ? await addContentLink(admin, access.userId, { url: body.url, title: typeof body.title === "string" ? body.title : "" }) : { ok: false, error: "Requête invalide" };
      break;
    case "deleteContent":
      result = typeof body.id === "string" ? await deleteContentLink(admin, access.userId, body.id) : { ok: false, error: "Requête invalide" };
      break;
    default:
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: 422 });
}
