import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role, Workspace, Restaurant } from "@/lib/types";

type WorkspaceRow = {
  id: string;
  name: string;
  created_at: string;
};

function mapWorkspace(row: WorkspaceRow): Workspace {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspaces").select("*").eq("id", workspaceId).maybeSingle();
  if (error || !data) return null;
  return mapWorkspace(data as WorkspaceRow);
}

export type WorkspaceMemberWithRestaurants = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  status: "actif" | "invite";
  restaurantNames: string[];
};

/**
 * Members of a workspace, each carrying the names of the workspace's
 * restaurants they're actually assigned to (via restaurant_members) — the
 * workspace role alone doesn't imply restaurant access, assignment does.
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberWithRestaurants[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, status")
    .eq("workspace_id", workspaceId);

  if (error || !data) return [];

  type MemberRow = { id: string; user_id: string; role: Role; status: "active" | "invited" };
  const rows = data as MemberRow[];
  const userIds = rows.map((r) => r.user_id);
  if (userIds.length === 0) return [];

  const [{ data: profiles }, { data: restaurantMembers }, { data: workspaceRestaurants }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds),
    supabase.from("restaurant_members").select("user_id, restaurant_id").in("user_id", userIds).eq("status", "active"),
    supabase.from("restaurants").select("id, name").eq("workspace_id", workspaceId),
  ]);

  type ProfileRow = { id: string; full_name: string | null; email: string | null; avatar_url: string | null };
  const profileById = new Map(((profiles as ProfileRow[]) ?? []).map((p) => [p.id, p]));
  const restaurantNameById = new Map(
    ((workspaceRestaurants as { id: string; name: string }[]) ?? []).map((r) => [r.id, r.name])
  );

  const restaurantNamesByUser = new Map<string, string[]>();
  for (const m of (restaurantMembers as { user_id: string; restaurant_id: string }[]) ?? []) {
    const name = restaurantNameById.get(m.restaurant_id);
    if (!name) continue; // only restaurants that belong to this workspace
    const list = restaurantNamesByUser.get(m.user_id) ?? [];
    list.push(name);
    restaurantNamesByUser.set(m.user_id, list);
  }

  return rows.map((row) => {
    const profile = profileById.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      name: profile?.full_name ?? profile?.email ?? "—",
      email: profile?.email ?? "",
      avatarUrl: profile?.avatar_url ?? null,
      role: row.role,
      status: row.status === "active" ? "actif" : "invite",
      restaurantNames: restaurantNamesByUser.get(row.user_id) ?? [],
    };
  });
}

export async function updateWorkspaceName(workspaceId: string, name: string): Promise<boolean> {
  if (!name.trim()) return false;
  const supabase = await createClient();
  const { error } = await supabase.from("workspaces").update({ name: name.trim() }).eq("id", workspaceId);
  return !error;
}

/**
 * Workspaces the current authenticated user is an active member of,
 * via workspace_members. Returns an empty array if not signed in.
 */
export async function getUserWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace:workspaces(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error || !data) return [];

  return data
    .map((row) => row.workspace as unknown as WorkspaceRow | null)
    .filter((w): w is WorkspaceRow => Boolean(w))
    .map(mapWorkspace);
}

/**
 * Restaurants belonging to a workspace — relies on the restaurants RLS policy
 * (restaurants_member_select) already allowing workspace members through.
 */
export async function getWorkspaceRestaurants(workspaceId: string): Promise<Restaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error || !data) return [];

  // Mirrors mapRestaurant() in lib/data/restaurants.ts — kept local to avoid
  // exporting that module's private row type just for this one call site.
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    city: row.city ?? "",
    province: row.province ?? "QC",
    postalCode: row.postal_code,
    timezone: row.timezone,
    currency: row.currency,
    serviceModel: row.service_model,
    operatingDays: row.operating_days ?? [],
    color: row.color ?? "var(--mv-green)",
    lng: row.lng,
    lat: row.lat,
    website: row.website,
    description: row.description,
    phone: row.phone,
    openingHours: row.opening_hours,
    googlePlaceId: row.google_place_id,
    workspaceId: row.workspace_id,
    loyaltyPointsPerDollar: row.loyalty_points_per_dollar ?? 1,
    taxRate: row.tax_rate ?? 0.14975,
    acceptsTips: row.accepts_tips ?? true,
  }));
}

/**
 * Creates a workspace and immediately makes the current user its owner.
 * The workspace_members insert relies on the bootstrap escape hatch in
 * 0011_workspaces.sql (`user_id = auth.uid()`) since no membership row
 * exists yet at insert time.
 */
export async function createWorkspace(name: string): Promise<Workspace | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !name.trim()) return null;

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name: name.trim() })
    .select("*")
    .single();

  if (error || !workspace) return null;

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memberError) return null;

  return mapWorkspace(workspace as WorkspaceRow);
}

/**
 * Links an existing restaurant (that the user owns/manages) to a workspace
 * — only if it isn't already attached to one, so a workspace manager can't
 * reassign a restaurant that's homed in a different workspace out from
 * under it. Returns false both on a DB error and when no row matched
 * (restaurant not found, or already assigned elsewhere).
 */
export async function assignRestaurantToWorkspace(
  restaurantId: string,
  workspaceId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update({ workspace_id: workspaceId })
    .eq("id", restaurantId)
    .is("workspace_id", null)
    .select("id");

  return !error && (data?.length ?? 0) > 0;
}

/**
 * Compensating cleanup for createWorkspace() when the immediately-following
 * restaurant assignment fails — otherwise the workspace is left orphaned
 * (a workspace_members row with no restaurant, invisible in the UI but
 * cluttering the table) and a retry mints another one. Admin client because
 * there's no workspaces_delete RLS policy (deleting one's own workspace
 * isn't a supported end-user action today, only this internal rollback).
 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("workspaces").delete().eq("id", workspaceId);
}
