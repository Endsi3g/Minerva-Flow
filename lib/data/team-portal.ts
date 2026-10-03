import { createClient } from "@/lib/supabase/server";

export type TeamPortalAccess = {
  userId: string;
  isTeamMember: boolean;
  isAmbassador: boolean;
  firstName: string | null;
};

/**
 * Gate for /equipe — distinct from isPlatformAdmin (lib/data/admin.ts),
 * which grants full restaurant-admin powers. A team member here only
 * reaches the internal metrics dashboard; an ambassador only reaches their
 * own referral/commission tools (already built — flow_ambassadors).
 * Returns null when the signed-in user is neither, so the layout can bounce
 * them back to the portal's own login rather than the main app.
 */
export async function getTeamPortalAccess(): Promise<TeamPortalAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: ambassador }] = await Promise.all([
    supabase.from("profiles").select("is_team_member, full_name").eq("id", user.id).maybeSingle(),
    supabase.from("flow_ambassadors").select("id").eq("user_id", user.id).eq("status", "active").maybeSingle(),
  ]);

  const isTeamMember = (profile as { is_team_member: boolean } | null)?.is_team_member ?? false;
  const isAmbassador = Boolean(ambassador);
  if (!isTeamMember && !isAmbassador) return null;

  const fullName = (profile as { full_name: string | null } | null)?.full_name ?? null;
  return {
    userId: user.id,
    isTeamMember,
    isAmbassador,
    firstName: fullName ? fullName.split(" ")[0] : null,
  };
}
