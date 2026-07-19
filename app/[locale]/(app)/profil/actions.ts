"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { updateMyProfileField } from "@/lib/data/profile";
import { deleteMyAccount, type DeleteAccountResult } from "@/lib/data/account-deletion";
import {
  getMyCalendarConnection,
  disconnectMyCalendar,
  getMemberCalendarAccessToken,
  type MemberCalendarConnection,
} from "@/lib/data/member-calendar";
import { fetchUpcomingEvents, type UpcomingCalendarEvent } from "@/lib/google/member-calendar";
import { createClient } from "@/lib/supabase/server";

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Updates the current user's display name (profiles.full_name). Logs the
 * activity against the current restaurant when the user belongs to one —
 * a brand-new user mid-onboarding may not have one yet.
 */
export async function updateProfileNameAction(fullName: string): Promise<UpdateProfileResult> {
  const trimmed = fullName.trim();
  if (!trimmed) return { ok: false, error: "Le nom ne peut pas être vide." };

  const membership = await getCurrentMembership();
  const ok = await updateMyProfileField(membership?.restaurantId ?? null, { fullName: trimmed });
  if (!ok) return { ok: false, error: "Impossible d'enregistrer le nom. Réessayez." };

  revalidatePath("/profil");
  return { ok: true };
}

/** Self-serve deletion (Loi 25 — droit à l'effacement). See lib/data/account-deletion.ts for the ownership guard. */
export async function deleteMyAccountAction(): Promise<DeleteAccountResult> {
  return deleteMyAccount();
}

/**
 * Persists the public URL of a freshly-uploaded avatar (profiles.avatar_url)
 * after hooks/use-avatar-upload.ts has already pushed the file to the
 * "avatars" storage bucket.
 */
export async function updateProfileAvatarAction(avatarUrl: string): Promise<UpdateProfileResult> {
  if (!avatarUrl.trim()) return { ok: false, error: "URL de photo invalide." };

  const membership = await getCurrentMembership();
  const ok = await updateMyProfileField(membership?.restaurantId ?? null, { avatarUrl });
  if (!ok) return { ok: false, error: "Impossible d'enregistrer la photo. Réessayez." };

  revalidatePath("/profil");
  return { ok: true };
}

export async function getMyCalendarConnectionAction(): Promise<MemberCalendarConnection> {
  return getMyCalendarConnection();
}

export async function disconnectMyCalendarAction(): Promise<void> {
  await disconnectMyCalendar();
  revalidatePath("/profil");
  revalidatePath("/horaire");
}

/** Used by both /profil (connection card) and /horaire (schedule sidebar). */
export async function getMyUpcomingCalendarEventsAction(): Promise<UpcomingCalendarEvent[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const accessToken = await getMemberCalendarAccessToken(user.id);
  if (!accessToken) return [];

  return fetchUpcomingEvents(accessToken);
}
