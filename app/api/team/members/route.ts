import { NextResponse } from "next/server";
import { resolveNativeTeamAccess } from "@/lib/auth/native-team";
import { getTeamDirectory } from "@/lib/data/team-members";

/** Team directory — employees only; ambassadors never see it. */
export async function GET(req: Request) {
  const access = await resolveNativeTeamAccess(req);
  if (!access) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!access.isTeamMember) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  return NextResponse.json({ members: await getTeamDirectory(access), currentUserId: access.userId });
}
