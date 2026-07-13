import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/data/activity";
import type { Program, ProgramStatus, ProgramType } from "@/lib/types";

type ProgramRow = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  type: string;
  start_date: string;
  end_date: string;
  objective: string | null;
  revenue_goal: number | null;
  expected_cost: number | null;
  revenue: number;
  cost: number;
  status: string;
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

/**
 * Maps DB rows into the Program shape. `dailyRevenue` can't be derived from
 * the current schema (service_days has no program_id link), so it's always
 * returned empty — callers needing a revenue trend should aggregate
 * service_days directly (see lib/reports.ts).
 */
function mapProgram(
  row: ProgramRow,
  campaignIds: string[],
  notes: { author: string; date: string; text: string }[]
): Program {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ProgramType,
    restaurantId: row.restaurant_id,
    startDate: row.start_date,
    endDate: row.end_date,
    revenue: row.revenue,
    cost: row.cost,
    status: row.status as ProgramStatus,
    dailyRevenue: [],
    campaignIds,
    consultantNotes: notes,
    description: row.description,
    objective: row.objective,
    revenueGoal: row.revenue_goal,
    expectedCost: row.expected_cost,
    createdBy: row.created_by,
  };
}

async function notesForPrograms(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programIds: string[]
): Promise<Map<string, { author: string; date: string; text: string }[]>> {
  const map = new Map<string, { author: string; date: string; text: string }[]>();
  if (programIds.length === 0) return map;

  const { data } = await supabase
    .from("notes")
    .select("entity_id, author_id, text, created_at")
    .eq("entity_type", "program")
    .in("entity_id", programIds)
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

async function campaignIdsForPrograms(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (programIds.length === 0) return map;

  const { data } = await supabase
    .from("campaigns")
    .select("id, program_id")
    .in("program_id", programIds);

  for (const c of (data as { id: string; program_id: string }[]) ?? []) {
    const list = map.get(c.program_id) ?? [];
    list.push(c.id);
    map.set(c.program_id, list);
  }
  return map;
}

export async function getPrograms(restaurantId: string): Promise<Program[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_programs")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("start_date", { ascending: false });

  if (error || !data) return [];

  const rows = data as ProgramRow[];
  const ids = rows.map((r) => r.id);
  const [notesMap, campaignsMap] = await Promise.all([
    notesForPrograms(supabase, ids),
    campaignIdsForPrograms(supabase, ids),
  ]);

  return rows.map((row) =>
    mapProgram(row, campaignsMap.get(row.id) ?? [], notesMap.get(row.id) ?? [])
  );
}

export async function getProgram(restaurantId: string, id: string): Promise<Program | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_programs")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ProgramRow;
  const [notesMap, campaignsMap] = await Promise.all([
    notesForPrograms(supabase, [row.id]),
    campaignIdsForPrograms(supabase, [row.id]),
  ]);

  return mapProgram(row, campaignsMap.get(row.id) ?? [], notesMap.get(row.id) ?? []);
}

export type ProgramInput = {
  name: string;
  description?: string | null;
  type: ProgramType;
  startDate: string;
  endDate: string;
  objective?: string | null;
  revenueGoal?: number | null;
  expectedCost?: number | null;
  status?: ProgramStatus;
};

export async function createProgram(
  restaurantId: string,
  input: ProgramInput
): Promise<Program | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("revenue_programs")
    .insert({
      restaurant_id: restaurantId,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      start_date: input.startDate,
      end_date: input.endDate,
      objective: input.objective ?? null,
      revenue_goal: input.revenueGoal ?? null,
      expected_cost: input.expectedCost ?? null,
      status: input.status ?? "planifie",
      created_by: user?.id,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "program.create",
    entityType: "program",
    entityId: data.id,
    description: `A créé le programme "${input.name}"`,
  });

  return mapProgram(data as ProgramRow, [], []);
}

export async function updateProgram(
  restaurantId: string,
  id: string,
  patch: Partial<ProgramInput>
): Promise<Program | null> {
  const supabase = await createClient();

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.type !== undefined) dbPatch.type = patch.type;
  if (patch.startDate !== undefined) dbPatch.start_date = patch.startDate;
  if (patch.endDate !== undefined) dbPatch.end_date = patch.endDate;
  if (patch.objective !== undefined) dbPatch.objective = patch.objective;
  if (patch.revenueGoal !== undefined) dbPatch.revenue_goal = patch.revenueGoal;
  if (patch.expectedCost !== undefined) dbPatch.expected_cost = patch.expectedCost;
  if (patch.status !== undefined) dbPatch.status = patch.status;

  const { data, error } = await supabase
    .from("revenue_programs")
    .update(dbPatch)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "program.update",
    entityType: "program",
    entityId: id,
    description: `A modifié le programme "${data.name}"`,
  });

  return getProgram(restaurantId, id);
}

export async function deleteProgram(restaurantId: string, id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("revenue_programs")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", id);

  if (error) return false;

  await logActivity({
    restaurantId,
    actionType: "program.delete",
    entityType: "program",
    entityId: id,
    description: "A supprimé un programme",
  });

  return true;
}
