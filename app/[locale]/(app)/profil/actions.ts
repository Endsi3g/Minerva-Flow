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

export type SubmitProposalResult =
  | { ok: true; proposal: import("@/lib/types").EcosystemAppProposal }
  | { ok: false; error: string };

export async function submitAppProposalAction(input: {
  appName: string;
  category: string;
  description: string;
}): Promise<SubmitProposalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const appName = input.appName.trim();
  const category = input.category.trim();
  const description = input.description.trim();

  if (!appName || !category || !description) {
    return { ok: false, error: "Veuillez remplir tous les champs obligatoires." };
  }

  const membership = await getCurrentMembership();
  const restaurantId = membership?.restaurantId ?? null;

  const { data, error } = await supabase
    .from("ecosystem_app_proposals")
    .insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      app_name: appName,
      category,
      description,
      status: "submitted",
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: "Erreur lors de la soumission de votre proposition." };
  }

  revalidatePath("/profil");
  return {
    ok: true,
    proposal: {
      id: data.id,
      userId: data.user_id,
      restaurantId: data.restaurant_id,
      appName: data.app_name,
      category: data.category,
      description: data.description,
      status: data.status,
      createdAt: data.created_at,
    },
  };
}

export async function getMyProposalsAction(): Promise<import("@/lib/types").EcosystemAppProposal[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ecosystem_app_proposals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    appName: row.app_name,
    category: row.category,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
  }));
}

