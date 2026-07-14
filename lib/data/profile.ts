import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { Role } from "@/lib/types";

export type ProfilePatch = {
  fullName?: string;
  avatarUrl?: string;
};

export type MyProfile = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

/**
 * The current authenticated user's own profile row, used by /profil.
 * profiles.full_name/avatar_url are canonical everywhere else in the app
 * (team lists, activity log authors…); falls back to auth metadata / email
 * for a brand-new user whose profiles row hasn't caught up yet.
 */
export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const row = data as
    | { full_name: string | null; email: string | null; avatar_url: string | null }
    | null;

  return {
    id: user.id,
    fullName:
      row?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email || "",
    email: row?.email || user.email || "",
    avatarUrl: row?.avatar_url || (user.user_metadata?.avatar_url as string | undefined) || null,
  };
}

/** Self-service update — RLS (profiles_self_update) restricts this to the caller's own row. */
export async function updateProfile(patch: ProfilePatch): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const dbPatch: Record<string, unknown> = {};
  if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
  if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
  if (Object.keys(dbPatch).length === 0) return true;

  const { error } = await supabase.from("profiles").update(dbPatch).eq("id", user.id);
  return !error;
}

/**
 * Name/avatar edits from the /profil page — wraps updateProfile() above and
 * additionally mirrors the change into the auth user_metadata (so
 * lib/data/session.ts, which bootstraps AuthUser from the auth user rather
 * than `profiles`, reflects it on the next server render too) and logs the
 * activity for the current restaurant.
 */
export async function updateMyProfileField(
  restaurantId: string | null,
  patch: ProfilePatch
): Promise<boolean> {
  const ok = await updateProfile(patch);
  if (!ok) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const metadata: Record<string, unknown> = {};
  if (patch.fullName !== undefined) metadata.full_name = patch.fullName;
  if (patch.avatarUrl !== undefined) metadata.avatar_url = patch.avatarUrl;
  if (Object.keys(metadata).length > 0) {
    await supabase.auth.updateUser({ data: metadata });
  }

  if (restaurantId) {
    await logActivity({
      restaurantId,
      actionType: patch.avatarUrl !== undefined ? "profile.update_avatar" : "profile.update_name",
      entityType: "profile",
      entityId: user.id,
      description:
        patch.avatarUrl !== undefined
          ? "A mis à jour sa photo de profil"
          : "A mis à jour son nom de profil",
    });
  }

  return true;
}

export async function completeOnboarding(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);
  return !error;
}

/**
 * Best-effort: only succeeds when the caller is owner/manager on that
 * restaurant (members_manage_update RLS policy) — invited staff/consultants
 * onboarding into someone else's restaurant simply can't self-promote, and
 * that's fine, this step is a nicety and never blocks onboarding.
 */
export async function updateMyRole(restaurantId: string, role: Role): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("restaurant_members")
    .update({ role })
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id);
  return !error;
}
