import { NextResponse } from "next/server";
import { resolveNativeTeamAccess } from "@/lib/auth/native-team";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeTeamMetrics } from "@/lib/data/team-metrics";
import { readGoalsSnapshot, writeGoal } from "@/lib/data/team-goals";

/** Monthly goals are revenue targets: team members only, never ambassadors. */
export async function GET(req: Request) {
  const access = await resolveNativeTeamAccess(req);
  if (!access) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!access.isTeamMember) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const metrics = await computeTeamMetrics();
  return NextResponse.json(await readGoalsSnapshot(createAdminClient(), metrics));
}

export async function POST(req: Request) {
  const access = await resolveNativeTeamAccess(req);
  if (!access) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!access.isTeamMember) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { metric?: unknown; target?: unknown } | null;
  if (typeof body?.metric !== "string" || typeof body.target !== "number") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const ok = await writeGoal(createAdminClient(), access.userId, body.metric, body.target);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Cible invalide" }, { status: 422 });
}
