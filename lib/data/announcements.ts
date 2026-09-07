import { createClient } from "@/lib/supabase/server";
import type { PlatformAnnouncement, PlatformSurveyResponse } from "@/lib/types";

export async function getActiveAnnouncements(): Promise<PlatformAnnouncement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("platform_announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    badgeLabel: row.badge_label || "Nouveauté",
    category: row.category || "feature",
    callToActionLabel: row.call_to_action_label,
    callToActionUrl: row.call_to_action_url,
    pollQuestion: row.poll_question,
    pollOptions: Array.isArray(row.poll_options) ? row.poll_options : [],
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export type SubmitSurveyInput = {
  announcementId: string;
  userId?: string | null;
  customerId?: string | null;
  selectedOption: string;
  feedbackText?: string | null;
  platform: "web" | "ios";
};

export async function submitSurveyResponse(
  input: SubmitSurveyInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("platform_survey_responses").insert({
    announcement_id: input.announcementId,
    user_id: input.userId ?? null,
    customer_id: input.customerId ?? null,
    selected_option: input.selectedOption,
    feedback_text: input.feedbackText?.trim() || null,
    platform: input.platform,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
