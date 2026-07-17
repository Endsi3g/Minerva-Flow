"use server";

import { revalidatePath } from "next/cache";
import { getCurrentWorkspaceMembership } from "@/lib/data/current-workspace";
import { getCurrentRestaurantId, getCurrentMembership } from "@/lib/data/current-restaurant";
import {
  getWorkspace,
  getWorkspaceMembers,
  getWorkspaceRestaurants,
  updateWorkspaceName,
  createWorkspace,
  assignRestaurantToWorkspace,
  deleteWorkspace,
  type WorkspaceMemberWithRestaurants,
} from "@/lib/data/workspaces";
import {
  createInviteLink,
  listInvites,
  type WorkspaceInvite,
  type WorkspaceInviteListEntry,
} from "@/lib/data/workspace-invites";
import type { Restaurant, Role, Workspace } from "@/lib/types";

async function requireWorkspaceManager(workspaceId: string) {
  const membership = await getCurrentWorkspaceMembership();
  if (!membership || membership.workspaceId !== workspaceId) return null;
  if (!["owner", "manager"].includes(membership.role)) return null;
  return membership;
}

export type WorkspaceHubData = {
  workspace: Workspace;
  members: WorkspaceMemberWithRestaurants[];
  restaurants: Restaurant[];
  canManage: boolean;
};

/** Bootstraps the /workspace hub — null means the current restaurant has no workspace yet. */
export async function getWorkspaceHubDataAction(): Promise<WorkspaceHubData | null> {
  const membership = await getCurrentWorkspaceMembership();
  if (!membership) return null;

  const [workspace, members, restaurants] = await Promise.all([
    getWorkspace(membership.workspaceId),
    getWorkspaceMembers(membership.workspaceId),
    getWorkspaceRestaurants(membership.workspaceId),
  ]);
  if (!workspace) return null;

  return { workspace, members, restaurants, canManage: ["owner", "manager"].includes(membership.role) };
}

/** For the current restaurant, when it has no workspace yet — creates one and links it. */
export async function createWorkspaceForCurrentRestaurantAction(name: string): Promise<boolean> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId || !name.trim()) return false;

  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId || !["owner", "manager"].includes(membership.role)) {
    return false;
  }

  const workspace = await createWorkspace(name);
  if (!workspace) return false;

  const ok = await assignRestaurantToWorkspace(restaurantId, workspace.id);
  if (ok) {
    revalidatePath("/workspace");
  } else {
    // Assignment failed (e.g. the restaurant got assigned elsewhere in a
    // race) — don't leave an empty, ownerless-looking workspace behind.
    await deleteWorkspace(workspace.id);
  }
  return ok;
}

export async function renameWorkspaceAction(workspaceId: string, name: string): Promise<boolean> {
  const membership = await requireWorkspaceManager(workspaceId);
  if (!membership) return false;

  const ok = await updateWorkspaceName(workspaceId, name);
  if (ok) revalidatePath("/workspace");
  return ok;
}

/** Assigns one of the current user's own restaurants (not yet in any workspace) to this workspace. */
export async function assignRestaurantToWorkspaceAction(
  restaurantId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await requireWorkspaceManager(workspaceId);
  if (!membership) return false;

  const ok = await assignRestaurantToWorkspace(restaurantId, workspaceId);
  if (ok) revalidatePath("/workspace");
  return ok;
}

// Deliberately excludes "owner" — Role is erased at runtime, so without this
// allowlist a manager could call this action directly (bypassing the invite
// modal's own role dropdown) and mint themselves or anyone else a co-owner.
const INVITABLE_ROLES: Role[] = ["manager", "staff", "consultant"];

export async function createWorkspaceInviteLinkAction(
  workspaceId: string,
  role: Role,
  restaurantIds: string[]
): Promise<WorkspaceInvite | null> {
  const membership = await requireWorkspaceManager(workspaceId);
  if (!membership || !INVITABLE_ROLES.includes(role)) return null;

  return createInviteLink(workspaceId, role, restaurantIds);
}

export async function listWorkspaceInvitesAction(workspaceId: string): Promise<WorkspaceInviteListEntry[]> {
  const membership = await requireWorkspaceManager(workspaceId);
  if (!membership) return [];

  return listInvites(workspaceId);
}
