import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { Recommendation, RecommendationStatus } from "@/lib/types";

type RecommendationRow = {
  id: string;
  restaurant_id: string;
  diagnosis: string;
  suggested_action: string;
  related_metric: string | null;
  related_program_id: string | null;
  related_campaign_id: string | null;
  status: RecommendationStatus;
  created_at: string;
};

function mapRecommendation(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    diagnosis: row.diagnosis,
    suggestedAction: row.suggested_action,
    relatedMetric: row.related_metric ?? undefined,
    relatedProgramId: row.related_program_id,
    relatedCampaignId: row.related_campaign_id,
    status: row.status,
    // The recommendations table doesn't track origin — rows persisted here
    // are treated as AI-sourced; rule-based ones come from
    // lib/engine/recommendations.ts and are never written to this table.
    source: "ia",
  };
}

export async function getRecommendations(restaurantId: string): Promise<Recommendation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as RecommendationRow[]).map(mapRecommendation);
}

export type RecommendationInput = {
  diagnosis: string;
  suggestedAction: string;
  relatedMetric?: string | null;
  relatedProgramId?: string | null;
  relatedCampaignId?: string | null;
};

export async function createRecommendation(
  restaurantId: string,
  input: RecommendationInput
): Promise<Recommendation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recommendations")
    .insert({
      restaurant_id: restaurantId,
      diagnosis: input.diagnosis,
      suggested_action: input.suggestedAction,
      related_metric: input.relatedMetric ?? null,
      related_program_id: input.relatedProgramId ?? null,
      related_campaign_id: input.relatedCampaignId ?? null,
      status: "nouvelle",
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "recommendation.create",
    entityType: "recommendation",
    entityId: data.id,
    description: "A ajouté une recommandation",
  });

  return mapRecommendation(data as RecommendationRow);
}

export async function updateRecommendationStatus(
  restaurantId: string,
  id: string,
  status: RecommendationStatus
): Promise<Recommendation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recommendations")
    .update({ status })
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "recommendation.update_status",
    entityType: "recommendation",
    entityId: id,
    description: `A marqué une recommandation comme "${status}"`,
  });

  return mapRecommendation(data as RecommendationRow);
}
