import { createClient } from "@/lib/supabase/server";
import type { ActivityLogEntry } from "@/lib/types";

type ActivityLogRow = {
  id: string;
  restaurant_id: string;
  actor_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  created_at: string;
};

function mapActivity(row: ActivityLogRow, actorName: string): ActivityLogEntry {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    actorId: row.actor_id,
    actorName,
    actionType: row.action_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    createdAt: row.created_at,
  };
}

/**
 * Looks up display names for a set of auth.users ids via `profiles`.
 * profiles.id references auth.users(id) but there's no FK from these
 * tables' actor/author/created_by columns straight to `profiles`, so we
 * can't rely on PostgREST's embedded-join syntax — fetch and merge instead.
 */
async function namesByUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(userIds));
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueIds);

  for (const p of (data as { id: string; full_name: string | null }[]) ?? []) {
    map.set(p.id, p.full_name ?? "—");
  }
  return map;
}

export async function getActivityLog(
  restaurantId: string,
  limit = 30
): Promise<ActivityLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const rows = data as ActivityLogRow[];
  const names = await namesByUserId(supabase, rows.map((r) => r.actor_id));
  return rows.map((row) => mapActivity(row, names.get(row.actor_id) ?? "—"));
}

export type LogActivityInput = {
  restaurantId: string;
  actionType: string;
  entityType?: string | null;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
};

/**
 * Inserts a row into activity_log for the current authenticated user.
 * Call this after every successful create/update/delete mutation, with a
 * short French description (ex: "A ajouté la journée du 12 juillet").
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_log").insert({
    restaurant_id: input.restaurantId,
    actor_id: user.id,
    action_type: input.actionType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    description: input.description,
    metadata: input.metadata ?? {},
  });
}
