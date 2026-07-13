import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { Campaign, CampaignChannel, CampaignStatus, CampaignType } from "@/lib/types";

type CampaignRow = {
  id: string;
  restaurant_id: string;
  program_id: string | null;
  name: string;
  description: string | null;
  channel: string;
  type: string;
  start_date: string;
  end_date: string;
  cost: number;
  status: string;
  estimated_revenue: number;
  visites: number;
  confidence: "fort" | "moyen" | "faible" | "insuffisant";
  created_by: string | null;
  created_at: string;
};

type NoteRow = {
  entity_id: string;
  author_id: string | null;
  text: string;
  created_at: string;
};

/**
 * notes.author_id references auth.users, not `profiles` directly, so
 * PostgREST can't embed the join — fetch profile names and merge instead.
 */
async function namesByUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: (string | null)[]
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase.from("profiles").select("id, full_name").in("id", uniqueIds);
  for (const p of (data as { id: string; full_name: string | null }[]) ?? []) {
    map.set(p.id, p.full_name ?? "—");
  }
  return map;
}

function impactFromConfidence(
  confidence: CampaignRow["confidence"]
): "fort" | "moyen" | "faible" {
  return confidence === "insuffisant" ? "faible" : confidence;
}

function mapCampaign(
  row: CampaignRow,
  notes: { author: string; date: string; text: string }[]
): Campaign {
  return {
    id: row.id,
    name: row.name,
    type: row.type as CampaignType,
    channel: row.channel as CampaignChannel,
    restaurantId: row.restaurant_id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as CampaignStatus,
    description: row.description ?? "",
    estimatedRevenue: row.estimated_revenue,
    impact: impactFromConfidence(row.confidence),
    visites: row.visites,
    // No dedicated timeline table yet — left empty until one exists.
    timeline: [],
    notes,
    confidence: row.confidence,
    programId: row.program_id,
  };
}

async function notesForCampaigns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignIds: string[]
): Promise<Map<string, { author: string; date: string; text: string }[]>> {
  const map = new Map<string, { author: string; date: string; text: string }[]>();
  if (campaignIds.length === 0) return map;

  const { data } = await supabase
    .from("notes")
    .select("entity_id, author_id, text, created_at")
    .eq("entity_type", "campaign")
    .in("entity_id", campaignIds)
    .order("created_at", { ascending: true });

  const rows = (data as NoteRow[]) ?? [];
  const names = await namesByUserId(supabase, rows.map((n) => n.author_id));

  for (const n of rows) {
    const list = map.get(n.entity_id) ?? [];
    list.push({
      author: names.get(n.author_id ?? "") ?? "—",
      date: n.created_at.slice(0, 10),
      text: n.text,
    });
    map.set(n.entity_id, list);
  }
  return map;
}

export async function getCampaigns(
  restaurantId: string,
  opts?: { programId?: string }
): Promise<Campaign[]> {
  const supabase = await createClient();
  let query = supabase
    .from("campaigns")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("start_date", { ascending: false });

  if (opts?.programId) query = query.eq("program_id", opts.programId);

  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data as CampaignRow[];
  const notesMap = await notesForCampaigns(supabase, rows.map((r) => r.id));

  return rows.map((row) => mapCampaign(row, notesMap.get(row.id) ?? []));
}

export async function getCampaign(restaurantId: string, id: string): Promise<Campaign | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as CampaignRow;
  const notesMap = await notesForCampaigns(supabase, [row.id]);
  return mapCampaign(row, notesMap.get(row.id) ?? []);
}

export type CampaignInput = {
  name: string;
  description?: string | null;
  channel: CampaignChannel;
  type: CampaignType;
  startDate: string;
  endDate: string;
  cost?: number;
  status?: CampaignStatus;
  estimatedRevenue?: number;
  programId?: string | null;
};

export async function createCampaign(
  restaurantId: string,
  input: CampaignInput
): Promise<Campaign | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      restaurant_id: restaurantId,
      program_id: input.programId ?? null,
      name: input.name,
      description: input.description ?? null,
      channel: input.channel,
      type: input.type,
      start_date: input.startDate,
      end_date: input.endDate,
      cost: input.cost ?? 0,
      status: input.status ?? "planifiee",
      estimated_revenue: input.estimatedRevenue ?? 0,
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "campaign.create",
    entityType: "campaign",
    entityId: data.id,
    description: `A créé la campagne "${input.name}"`,
  });

  return mapCampaign(data as CampaignRow, []);
}

export async function updateCampaign(
  restaurantId: string,
  id: string,
  patch: Partial<CampaignInput>
): Promise<Campaign | null> {
  const supabase = await createClient();

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.channel !== undefined) dbPatch.channel = patch.channel;
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
  if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate;
  if (patch.cost !== undefined) dbPatch.cost = patch.cost;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.estimatedRevenue !== undefined) dbPatch.estimated_revenue = patch.estimatedRevenue;
  if (patch.programId !== undefined) dbPatch.program_id = patch.programId;

  const { data, error } = await supabase
    .from("campaigns")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "campaign.update",
    entityType: "campaign",
    entityId: id,
    description: `A modifié la campagne "${data.name}"`,
  });

  return getCampaign(restaurantId, id);
}

export async function deleteCampaign(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);

  if (error) return false;

  await logActivity({
    restaurantId,
    actionType: "campaign.delete",
    entityType: "campaign",
    entityId: id,
    description: "A supprimé une campagne",
  });

  return true;
}
