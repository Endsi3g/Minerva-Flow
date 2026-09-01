"use server";

import { completeOnboarding, updateMyRole } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { getCurrentRestaurantId, getCurrentMembership } from "@/lib/data/current-restaurant";
import { activateReferral } from "@/lib/data/referrals";
import { getPosConnections } from "@/lib/data/pos-connections";
import { getAdPlatformConnections } from "@/lib/data/ad-platforms";
import { getGoogleConnection } from "@/lib/data/google-connections";
import { getMyCalendarConnection } from "@/lib/data/member-calendar";
import { createInviteLink as createWorkspaceInviteLink } from "@/lib/data/workspace-invites";
import { getRestaurant } from "@/lib/data/restaurants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

export type ConnectedToolsStatus = {
  square: boolean;
  meta: boolean;
  instagram: boolean;
  "google-calendar": boolean;
  workspace: boolean;
};

/**
 * Real, DB-backed connection status for the onboarding "Connect your tools" step —
 * never trust client-side state for this: a popup can be blocked, cancelled, or fail
 * server-side, and the only way to know what actually happened is to ask the DB.
 */
export async function getConnectedToolsStatusAction(restaurantId: string): Promise<ConnectedToolsStatus> {
  const [posConnections, adConnections, googleConnection, calendarConnection] = await Promise.all([
    getPosConnections(restaurantId),
    getAdPlatformConnections(restaurantId),
    getGoogleConnection(restaurantId),
    getMyCalendarConnection(),
  ]);

  return {
    square: posConnections.some((c) => c.provider === "square" && c.status === "connecte"),
    meta: adConnections.some((c) => c.provider === "meta" && c.status === "connecte"),
    instagram: adConnections.some((c) => c.provider === "instagram" && c.status === "connecte"),
    "google-calendar": calendarConnection.connected,
    workspace: Boolean(googleConnection && googleConnection.status === "connecte"),
  };
}

/**
 * Best-effort — see updateMyRole()'s doc comment. A failed role update
 * never blocks the wizard from proceeding.
 */
export async function setMyRoleAction(restaurantId: string, role: Role): Promise<void> {
  await updateMyRole(restaurantId, role);
}

/**
 * The optional "Invitez votre équipe" onboarding step. Reuses the real
 * workspace-invite mechanism (same one Collaborateurs uses) rather than a
 * onboarding-only stand-in — always "staff" since that's the only sane
 * default for a teammate a brand-new owner is inviting sight-unseen; they
 * can change it later from Collaborateurs. A restaurant created moments
 * ago during onboarding may not have a workspace yet (createRestaurant only
 * assigns one when there's an existing mv_restaurant_id cookie context),
 * so this creates one on the fly rather than failing the invite.
 */
export async function sendTeamInviteAction(
  restaurantId: string,
  email: string
): Promise<{ ok: boolean; link?: string }> {
  const membership = await getCurrentMembership();
  if (!membership || membership.restaurantId !== restaurantId || !["owner", "manager"].includes(membership.role)) {
    return { ok: false };
  }

  const restaurant = await getRestaurant(restaurantId);
  if (!restaurant) return { ok: false };

  let workspaceId = restaurant.workspaceId;
  if (!workspaceId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const admin = createAdminClient();
    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .insert({ name: restaurant.name })
      .select("id")
      .single();
    if (workspaceError || !workspace) return { ok: false };
    workspaceId = (workspace as { id: string }).id;

    await admin
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: user.id, role: "owner", status: "active" });
    await admin.from("restaurants").update({ workspace_id: workspaceId }).eq("id", restaurantId);
  }

  const invite = await createWorkspaceInviteLink(workspaceId, "staff", [restaurantId], email.trim() || undefined);
  if (!invite) return { ok: false };

  return { ok: true, link: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite/w/${invite.token}` };
}

/**
 * Deliberately doesn't redirect() itself — this is called as a bare async
 * function from a client component (not a <form action>), and the caller
 * navigates via router.push() once this resolves so it can also flip local
 * submitting state without racing a server-thrown redirect.
 */
export async function finishOnboardingAction(): Promise<boolean> {
  const ok = await completeOnboarding();
  if (ok) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const posthog = getPostHogClient();
      posthog.capture({ distinctId: user.id, event: "onboarding_completed" });
      await posthog.flush();

      const referralCode = user.user_metadata?.referral_code as string | undefined;
      if (referralCode && user.email) {
        const restaurantId = await getCurrentRestaurantId();
        if (restaurantId) await activateReferral(referralCode, user.email, restaurantId);
      }
    }
  }
  return ok;
}
