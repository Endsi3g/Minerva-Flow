import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/data/activity";
import { notifyRestaurant } from "@/lib/data/notifications";
import { deletePhantomDefaultRestaurant } from "@/lib/data/restaurants";
import type { Role } from "@/lib/types";

const INVITE_TTL_DAYS = 7;

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  role: Role;
  restaurantIds: string[];
  token: string;
  expiresAt: string;
};

type InviteRow = {
  id: string;
  workspace_id: string;
  role: Role;
  restaurant_ids: string[];
  token: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
};

function mapInvite(row: InviteRow): WorkspaceInvite {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    role: row.role,
    restaurantIds: row.restaurant_ids,
    token: row.token,
    expiresAt: row.expires_at,
  };
}

/**
 * Generates a redeemable workspace invite link, scoped to a chosen role and
 * a chosen subset of the workspace's restaurants. Runs through the admin
 * client (like the restaurant-level equivalent in lib/data/invites.ts)
 * because the eventual redeemer may not have an account yet. The caller (a
 * server action) is responsible for checking that the actor is
 * owner/manager before calling this.
 */
export async function createInviteLink(
  workspaceId: string,
  role: Role,
  restaurantIds: string[]
): Promise<WorkspaceInvite | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Only restaurants that actually belong to this workspace can be assigned.
  const { data: workspaceRestaurants } = await supabase
    .from("restaurants")
    .select("id")
    .eq("workspace_id", workspaceId);
  const validIds = new Set(((workspaceRestaurants as { id: string }[] | null) ?? []).map((r) => r.id));
  const filteredRestaurantIds = restaurantIds.filter((id) => validIds.has(id));

  const token = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      role,
      restaurant_ids: filteredRestaurantIds,
      token,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (error || !data) return null;

  if (filteredRestaurantIds[0]) {
    await logActivity({
      restaurantId: filteredRestaurantIds[0],
      actionType: "workspace_invite.create_link",
      description: `A généré un lien d'invitation workspace (${role}).`,
    });
  }

  return mapInvite(data as InviteRow);
}

export type WorkspaceInviteListEntry = {
  id: string;
  role: Role;
  restaurantIds: string[];
  createdAt: string;
  expiresAt: string;
  status: "en_attente" | "expiree" | "utilisee";
  redeemedByEmail: string | null;
};

/** Every invite ever generated for a workspace, newest first. */
export async function listInvites(workspaceId: string): Promise<WorkspaceInviteListEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspace_invites")
    .select("id, role, restaurant_ids, created_at, expires_at, used_at, used_by")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const usedByIds = data.map((r) => r.used_by).filter((id): id is string => Boolean(id));
  const emailByUserId = new Map<string, string>();
  if (usedByIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, email").in("id", usedByIds);
    for (const p of (profiles as { id: string; email: string | null }[]) ?? []) {
      if (p.email) emailByUserId.set(p.id, p.email);
    }
  }

  return data.map((row) => ({
    id: row.id,
    role: row.role as Role,
    restaurantIds: row.restaurant_ids,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    status: row.used_at ? "utilisee" : new Date(row.expires_at) <= new Date() ? "expiree" : "en_attente",
    redeemedByEmail: row.used_by ? (emailByUserId.get(row.used_by) ?? null) : null,
  }));
}

export type WorkspaceInviteLookup = {
  workspaceId: string;
  workspaceName: string;
  role: Role;
  restaurantNames: string[];
  status: "valid" | "expired" | "used" | "not_found";
};

export async function getInviteByToken(token: string): Promise<WorkspaceInviteLookup> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspace_invites")
    .select("workspace_id, role, restaurant_ids, expires_at, used_at, workspaces(name)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return { workspaceId: "", workspaceName: "", role: "staff", restaurantNames: [], status: "not_found" };
  }

  const workspace = data.workspaces as unknown as { name: string } | null;
  const status: WorkspaceInviteLookup["status"] = data.used_at
    ? "used"
    : new Date(data.expires_at) <= new Date()
      ? "expired"
      : "valid";

  let restaurantNames: string[] = [];
  const restaurantIds = (data.restaurant_ids as string[] | null) ?? [];
  if (restaurantIds.length > 0) {
    const { data: restaurants } = await admin.from("restaurants").select("name").in("id", restaurantIds);
    restaurantNames = ((restaurants as { name: string }[] | null) ?? []).map((r) => r.name);
  }

  return {
    workspaceId: data.workspace_id,
    workspaceName: workspace?.name ?? "",
    role: data.role as Role,
    restaurantNames,
    status,
  };
}

/**
 * Redeems a workspace invite for the currently authenticated user: upserts
 * an active workspace_members row plus one active restaurant_members row
 * per restaurant the invite assigns, then marks the invite as used. All
 * writes go through the admin client since the redeemer has no membership
 * yet to pass RLS on the normal user-scoped path.
 *
 * The invite is claimed FIRST via a single conditional UPDATE
 * (`used_at is null and expires_at > now()`, checked via the returned row)
 * before any membership writes happen — this is what makes concurrent
 * redemptions of the same token safe: only one caller can ever win that
 * UPDATE. If the membership writes fail afterward, the claim is rolled back
 * so the token stays redeemable rather than being silently burned.
 */
export async function redeemInvite(token: string): Promise<{ ok: boolean; workspaceId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const admin = createAdminClient();
  const { data: claimed, error: claimError } = await admin
    .from("workspace_invites")
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("*")
    .maybeSingle();
  if (claimError || !claimed) return { ok: false };
  const invite = claimed;

  // Never downgrade an already-active member's role via a stale/misdirected invite.
  const { data: existingWorkspaceMember } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  const workspaceRole = (existingWorkspaceMember as { role: string } | null)?.role ?? invite.role;

  const { error: workspaceMemberError } = await admin
    .from("workspace_members")
    .upsert(
      { workspace_id: invite.workspace_id, user_id: user.id, role: workspaceRole, status: "active" },
      { onConflict: "workspace_id,user_id" }
    );

  const restaurantIds = (invite.restaurant_ids as string[] | null) ?? [];
  let restaurantMemberError: unknown = null;
  if (!workspaceMemberError && restaurantIds.length > 0) {
    const { data: existingRestaurantMembers } = await admin
      .from("restaurant_members")
      .select("restaurant_id, role")
      .in("restaurant_id", restaurantIds)
      .eq("user_id", user.id)
      .eq("status", "active");
    const existingRoleByRestaurant = new Map(
      ((existingRestaurantMembers as { restaurant_id: string; role: string }[] | null) ?? []).map((m) => [
        m.restaurant_id,
        m.role,
      ])
    );

    const result = await admin.from("restaurant_members").upsert(
      restaurantIds.map((restaurantId) => ({
        restaurant_id: restaurantId,
        user_id: user.id,
        role: existingRoleByRestaurant.get(restaurantId) ?? invite.role,
        status: "active",
      })),
      { onConflict: "restaurant_id,user_id" }
    );
    restaurantMemberError = result.error;
  }

  if (workspaceMemberError || restaurantMemberError) {
    // Roll back the claim so the invite stays redeemable instead of being
    // burned by a failed attempt.
    await admin.from("workspace_invites").update({ used_at: null, used_by: null }).eq("id", invite.id);
    return { ok: false };
  }

  for (const restaurantId of restaurantIds) {
    await logActivity({
      restaurantId,
      actionType: "workspace_invite.redeem",
      description: "A rejoint le workspace via un lien d'invitation.",
    });
    await notifyRestaurant({
      restaurantId,
      type: "invite.accepted",
      title: "Nouveau collaborateur",
      body: `${user.email ?? "Un utilisateur"} a rejoint l'établissement.`,
      link: "/collaborateurs",
      excludeUserId: user.id,
    });
  }

  await deletePhantomDefaultRestaurant(admin, user.id, restaurantIds);

  return { ok: true, workspaceId: invite.workspace_id };
}
