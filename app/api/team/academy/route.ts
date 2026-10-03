import { NextResponse } from "next/server";
import { resolveNativeTeamAccess } from "@/lib/auth/native-team";
import { getAcademyPages } from "@/lib/data/team-academy";

/** Same content as /equipe/academie; teamOnly sections never reach ambassadors. */
export async function GET(req: Request) {
  const access = await resolveNativeTeamAccess(req);
  if (!access) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  return NextResponse.json({ pages: getAcademyPages(access.isTeamMember) });
}
