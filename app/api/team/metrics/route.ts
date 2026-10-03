import { NextResponse } from "next/server";
import { resolveNativeTeamAccess } from "@/lib/auth/native-team";
import { computeTeamMetrics } from "@/lib/data/team-metrics";

/**
 * Native bridge for the /equipe metrics dashboard. The data is cross-tenant
 * (every restaurant, every subscription), so the iOS app's RLS-scoped
 * token can't read it directly — this verifies is_team_member server-side
 * from the Bearer token and only then reads with the admin client.
 * Ambassadors are deliberately rejected: revenue/churn are internal
 * financials.
 */
export async function GET(req: Request) {
  const access = await resolveNativeTeamAccess(req);
  if (!access) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!access.isTeamMember) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  return NextResponse.json(await computeTeamMetrics());
}
