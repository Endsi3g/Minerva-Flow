"use server";

import { createSupportRequest, getMySupportRequests, type SupportCategory, type SupportRequest } from "@/lib/data/support";
import { createFeatureFeedback } from "@/lib/data/feature-feedback";
import { sendFeatureFeedbackEmail } from "@/lib/email/resend";
import { getRestaurant } from "@/lib/data/restaurants";
import { createClient } from "@/lib/supabase/server";

export async function createSupportRequestAction(input: {
  restaurantId: string | null;
  category: SupportCategory;
  subject: string;
  message: string;
}): Promise<boolean> {
  if (!input.subject.trim() || !input.message.trim()) return false;
  return createSupportRequest(input);
}

export async function getMySupportRequestsAction(): Promise<SupportRequest[]> {
  return getMySupportRequests();
}

/**
 * Stores the vote/suggestion, then best-effort emails kbelceus776@gmail —
 * the DB row is the source of truth (survives even if the email fails),
 * the email is just so it's seen without needing to check the database.
 */
export async function submitFeatureFeedbackAction(input: {
  restaurantId: string | null;
  pollOption: string | null;
  suggestion: string | null;
}): Promise<boolean> {
  const pollOption = input.pollOption?.trim() || null;
  const suggestion = input.suggestion?.trim() || null;
  if (!pollOption && !suggestion) return false;

  const saved = await createFeatureFeedback({ restaurantId: input.restaurantId, pollOption, suggestion });
  if (!saved) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const [{ data: profile }, restaurant] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      input.restaurantId ? getRestaurant(input.restaurantId) : Promise.resolve(null),
    ]);
    await sendFeatureFeedbackEmail({
      submitterName: (profile as { full_name: string | null } | null)?.full_name || user.email || "Utilisateur",
      submitterEmail: user.email ?? "inconnu",
      restaurantName: restaurant?.name ?? null,
      pollOption,
      suggestion,
    }).catch(() => {});
  }

  return true;
}
