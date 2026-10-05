import { NextResponse } from "next/server";
import { resolveNativeTeamAccess } from "@/lib/auth/native-team";
import { getMemberProfile } from "@/lib/data/team-members";

/** Employees: any employee profile. Ambassadors: only their own ("me" or own id). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await resolveNativeTeamAccess(req);
  if (!access) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const profile = await getMemberProfile(access, id);
  if (!profile) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(profile);
}
