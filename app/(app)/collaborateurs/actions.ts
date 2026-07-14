"use server";

import { revalidatePath } from "next/cache";
import { updateTeamMemberRole, removeTeamMember } from "@/lib/data/team";
import { getActivityLog } from "@/lib/data/activity";
import type { ActivityLogEntry, Role } from "@/lib/types";

/**
 * Updates a member's role. Authorization is enforced by the
 * restaurant_members RLS policies (owner/manager can write) — this action
 * only guards against obviously malformed input.
 */
export async function updateMemberRoleAction(
  restaurantId: string,
  membershipId: string,
  role: Role
): Promise<boolean> {
  if (!restaurantId || !membershipId || !role) return false;

  const ok = await updateTeamMemberRole(restaurantId, membershipId, role);
  if (ok) revalidatePath("/collaborateurs");
  return ok;
}

/**
 * Removes a member from the current restaurant.
 */
export async function removeMemberAction(
  restaurantId: string,
  membershipId: string
): Promise<boolean> {
  if (!restaurantId || !membershipId) return false;

  const ok = await removeTeamMember(restaurantId, membershipId);
  if (ok) revalidatePath("/collaborateurs");
  return ok;
}

/**
 * Fetches a single member's activity log for the detail view, lazily
 * (only when a row is opened) rather than eagerly for every member on
 * the list page.
 */
export async function getMemberActivityAction(
  restaurantId: string,
  actorId: string
): Promise<ActivityLogEntry[]> {
  if (!restaurantId || !actorId) return [];
  return getActivityLog(restaurantId, { actorId, limit: 50 });
}
