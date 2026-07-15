import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportDef } from "@/lib/reports";
import type { AiReviewResult } from "@/lib/ai/review";

export type AiReview = {
  id: string;
  restaurantId: string;
  periodStart: string;
  periodEnd: string;
  source: "auto" | "manuelle";
  metrics: ReportDef[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  createdAt: string;
};

type AiReviewRow = {
  id: string;
  restaurant_id: string;
  period_start: string;
  period_end: string;
  source: "auto" | "manuelle";
  metrics: ReportDef[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  created_at: string;
};

function mapAiReview(row: AiReviewRow): AiReview {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    source: row.source,
    metrics: row.metrics,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    recommendations: row.recommendations,
    createdAt: row.created_at,
  };
}

export type SaveAiReviewInput = {
  restaurantId: string;
  periodStart: string;
  periodEnd: string;
  source: "auto" | "manuelle";
  metrics: ReportDef[];
  review: AiReviewResult;
  createdBy?: string | null;
};

/** Used by both the authenticated on-demand action (RLS-scoped client) and the cron route (admin client). */
export async function saveAiReview(
  input: SaveAiReviewInput,
  client?: ReturnType<typeof createAdminClient>
): Promise<AiReview | null> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase
    .from("ai_reviews")
    .insert({
      restaurant_id: input.restaurantId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      source: input.source,
      metrics: input.metrics,
      strengths: input.review.strengths,
      weaknesses: input.review.weaknesses,
      recommendations: input.review.recommendations,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapAiReview(data as AiReviewRow);
}

export async function getAiReviews(restaurantId: string): Promise<AiReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_reviews")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as AiReviewRow[]).map(mapAiReview);
}

export async function getAiReview(id: string): Promise<AiReview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ai_reviews").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapAiReview(data as AiReviewRow);
}
