"use server";

import { revalidatePath } from "next/cache";
import { updateTeamMemberRole, removeTeamMember } from "@/lib/data/team";
import { getActivityLog } from "@/lib/data/activity";
import { createInviteLink, listInvites, type RestaurantInvite, type InviteListEntry } from "@/lib/data/invites";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import type { ActivityLogEntry, Role } from "@/lib/types";

/**
 * Generates a redeemable invite link (7-day expiry, role pre-assigned).
 * Replaces the email-invite flow, which depends on outbound email that
 * isn't wired up yet — the owner/manager copies this link and shares it
 * themselves (SMS, WhatsApp, etc.).
 */
export async function createInviteLinkAction(
  restaurantId: string,
  role: Role
): Promise<RestaurantInvite | null> {
  if (!restaurantId || !role) return null;

  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId || !["owner", "manager"].includes(membership.role)) {
    return null;
  }

  return createInviteLink(restaurantId, role);
}

export async function listInvitesAction(restaurantId: string): Promise<InviteListEntry[]> {
  if (!restaurantId) return [];
  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId || !["owner", "manager"].includes(membership.role)) {
    return [];
  }
  return listInvites(restaurantId);
}

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
