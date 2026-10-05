import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { createAdminClient } from "@/lib/supabase/admin";

export type NativeTeamAccess = {
  userId: string;
  isTeamMember: boolean;
  isAmbassador: boolean;
};

/**
 * Bearer-token twin of getTeamPortalAccess (lib/data/team-portal.ts) for the
 * iOS app. Returns null when the token is invalid or the account is neither
 * an employee nor an active ambassador.
 */
export async function resolveNativeTeamAccess(req: Request): Promise<NativeTeamAccess | null> {
  const userId = await resolveNativeUserId(req);
  if (!userId) return null;

  const admin = createAdminClient();
  const [{ data: profile }, { data: ambassador }] = await Promise.all([
    admin.from("profiles").select("is_team_member").eq("id", userId).maybeSingle(),
    admin.from("flow_ambassadors").select("id").eq("user_id", userId).eq("status", "active").maybeSingle(),
  ]);

  const isTeamMember = (profile as { is_team_member: boolean } | null)?.is_team_member ?? false;
  const isAmbassador = Boolean(ambassador);
  if (!isTeamMember && !isAmbassador) return null;
  return { userId, isTeamMember, isAmbassador };
}
