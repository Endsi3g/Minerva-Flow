import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import type { Role } from "@/lib/types";

export type CurrentWorkspaceMembership = {
  workspaceId: string;
  role: Role;
};

/**
 * The current user's workspace-level membership (workspaceId + role),
 * resolved from the currently-selected restaurant's workspace_id. Returns
 * null if the user isn't signed in, has no current restaurant, that
 * restaurant has no workspace yet, or they have no active workspace_members
 * row for it.
 */
export async function getCurrentWorkspaceMembership(): Promise<CurrentWorkspaceMembership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return null;

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("workspace_id")
    .eq("id", restaurantId)
    .maybeSingle();

  const workspaceId = (restaurant as { workspace_id: string | null } | null)?.workspace_id;
  if (restaurantError || !workspaceId) return null;

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  return { workspaceId, role: data.role as Role };
}
