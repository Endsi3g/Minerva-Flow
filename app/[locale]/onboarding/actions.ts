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
import { sendLifecycleEmail } from "@/lib/email/lifecycle";
import { getReferralPrograms, createReferralProgram } from "@/lib/data/referral-programs";
import { getOrCreateReferralLink } from "@/lib/data/customer-referrals";
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
  // Entirely best-effort, like setMyRoleAction above — this is the optional
  // "Invitez votre équipe" onboarding step. Any failure here (misconfigured
  // admin client, a transient DB error, whatever) must never throw past this
  // function: the caller finishes onboarding regardless of whether the
  // invite went out, and an uncaught exception here would otherwise block
  // that (surfaced in testing — a missing SUPABASE_SERVICE_ROLE_KEY crashed
  // the whole "Terminer" action instead of just skipping the invite).
  try {
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
  } catch {
    return { ok: false };
  }
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
      const restaurantId = await getCurrentRestaurantId();
      if (referralCode && user.email && restaurantId) {
        await activateReferral(referralCode, user.email, restaurantId);
      }

      // Déclenchement immédiat de l'Email 1 (Bienvenue & première action)
      if (user.email) {
        let restaurantName: string | null = null;
        if (restaurantId) {
          const restaurant = await getRestaurant(restaurantId);
          restaurantName = restaurant?.name ?? null;
        }
        sendLifecycleEmail({
          userId: user.id,
          email: user.email,
          step: "welcome",
          params: {
            firstName: (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? null,
            restaurantName,
            hasRestaurant: Boolean(restaurantId),
          },
        }).catch((err) => console.error("[Onboarding] Erreur envoi email bienvenue:", err));
      }
    }
  }
  return ok;
}

export async function activateOnboardingReferralProgramAction(restaurantId: string): Promise<{
  ok: boolean;
  programName?: string;
  code?: string;
  url?: string;
}> {
  try {
    const programs = await getReferralPrograms(restaurantId);
    let activeProg = programs.find((p) => p.active) ?? programs[0];

    if (!activeProg) {
      const created = await createReferralProgram(restaurantId, {
        name: "Programme d'Accueil & Parrainage",
        description:
          "Invitez vos proches à découvrir notre établissement : 10 $ offerts pour le filleul et 10 $ pour le parrain.",
        goalCount: 1,
        rewardDescription: "10 $ de réduction sur l'addition",
        newCustomerBonusPoints: 50,
        referrerBonusPoints: 100,
      });
      if (created) activeProg = created;
    }

    if (!activeProg) return { ok: false };

    const admin = createAdminClient();
    const { data: customer } = await admin
      .from("customers")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .limit(1)
      .maybeSingle();

    let customerId = (customer as { id: string } | null)?.id;
    if (!customerId) {
      const { data: newCust } = await admin
        .from("customers")
        .insert({
          restaurant_id: restaurantId,
          name: "Client Privilégié",
          email: "ambassadeur@minervaflow.app",
        })
        .select("id")
        .single();
      customerId = (newCust as { id: string } | null)?.id;
    }

    if (!customerId) return { ok: false };

    const link = await getOrCreateReferralLink(customerId, activeProg.id);
    if (!link) return { ok: false };

    return {
      ok: true,
      programName: activeProg.name,
      code: link.code,
      url: `/p/${link.code}`,
    };
  } catch {
    return { ok: false };
  }
}

