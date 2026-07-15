import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import { broadcastNotification } from "@/lib/data/notifications";
import type { Role, TeamMember } from "@/lib/types";

type MembershipRow = {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: Role;
  status: "active" | "invited";
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

function statusLabel(status: "active" | "invited"): "actif" | "invite" {
  return status === "active" ? "actif" : "invite";
}

/**
 * restaurant_members.user_id references auth.users, not `profiles`
 * directly, so PostgREST can't embed the join — fetch and merge instead.
 */
async function profilesByUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Map<string, ProfileRow>> {
  const uniqueIds = Array.from(new Set(userIds));
  const map = new Map<string, ProfileRow>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", uniqueIds);

  for (const p of (data as ProfileRow[]) ?? []) {
    map.set(p.id, p);
  }
  return map;
}

function toTeamMember(
  row: MembershipRow,
  profile: ProfileRow | undefined,
  restaurantIds: string[]
): TeamMember {
  return {
    id: row.user_id,
    membershipId: row.id,
    name: profile?.full_name ?? profile?.email ?? "—",
    email: profile?.email ?? "",
    role: row.role,
    restaurantIds,
    status: statusLabel(row.status),
    avatarUrl: profile?.avatar_url ?? null,
  };
}

/**
 * Team members for a given restaurant, each carrying the full list of
 * restaurants they belong to (restaurantIds), matching the mock shape.
 */
export async function getTeamMembers(restaurantId: string): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_members")
    .select("id, restaurant_id, user_id, role, status")
    .eq("restaurant_id", restaurantId);

  if (error || !data) return [];

  const rows = data as MembershipRow[];
  const userIds = rows.map((r) => r.user_id);

  const [profiles, { data: allMemberships }] = await Promise.all([
    profilesByUserId(supabase, userIds),
    supabase.from("restaurant_members").select("user_id, restaurant_id").in("user_id", userIds),
  ]);

  const restaurantIdsByUser = new Map<string, string[]>();
  for (const m of (allMemberships as { user_id: string; restaurant_id: string }[]) ?? []) {
    const list = restaurantIdsByUser.get(m.user_id) ?? [];
    list.push(m.restaurant_id);
    restaurantIdsByUser.set(m.user_id, list);
  }

  return rows.map((row) =>
    toTeamMember(
      row,
      profiles.get(row.user_id),
      restaurantIdsByUser.get(row.user_id) ?? [row.restaurant_id]
    )
  );
}

export async function inviteTeamMember(
  restaurantId: string,
  userId: string,
  role: Role
): Promise<TeamMember | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_members")
    .insert({ restaurant_id: restaurantId, user_id: userId, role, status: "invited" })
    .select("id, restaurant_id, user_id, role, status")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "team.invite",
    entityType: "restaurant_member",
    entityId: data.id,
    description: "A invité un collaborateur",
  });

  const row = data as MembershipRow;
  const profiles = await profilesByUserId(supabase, [row.user_id]);
  return toTeamMember(row, profiles.get(row.user_id), [row.restaurant_id]);
}

export async function updateTeamMemberRole(
  restaurantId: string,
  membershipId: string,
  role: Role
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_members")
    .update({ role })
    .eq("restaurant_id", restaurantId)
    .eq("id", membershipId)
    .select("user_id")
    .single();

  if (error || !data) return false;

  await logActivity({
    restaurantId,
    actionType: "team.update_role",
    entityType: "restaurant_member",
    entityId: membershipId,
    description: `A mis à jour le rôle d'un collaborateur en "${role}"`,
  });

  await broadcastNotification({
    restaurantId,
    userIds: [data.user_id],
    type: "team.role_changed",
    title: "Votre rôle a changé",
    body: `Votre nouveau rôle : ${role}.`,
    link: "/profil",
  });

  return true;
}

export async function removeTeamMember(
  restaurantId: string,
  membershipId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurant_members")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", membershipId);

  if (error) return false;

  await logActivity({
    restaurantId,
    actionType: "team.remove",
    entityType: "restaurant_member",
    entityId: membershipId,
    description: "A retiré un collaborateur",
  });

  return true;
}
