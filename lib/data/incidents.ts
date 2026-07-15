import { createClient } from "@/lib/supabase/server";

export type Incident = {
  id: string;
  title: string;
  description: string;
  severity: "faible" | "moyenne" | "critique";
  occurredAt: string;
  affectedUserCount: number;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

type IncidentRow = {
  id: string;
  title: string;
  description: string;
  severity: "faible" | "moyenne" | "critique";
  occurred_at: string;
  affected_user_count: number;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
};

function mapIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    occurredAt: row.occurred_at,
    affectedUserCount: row.affected_user_count,
    resolution: row.resolution,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export async function getIncidents(): Promise<Incident[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incident_log")
    .select("*")
    .order("occurred_at", { ascending: false });

  if (error || !data) return [];
  return (data as IncidentRow[]).map(mapIncident);
}

export type CreateIncidentInput = {
  title: string;
  description: string;
  severity: "faible" | "moyenne" | "critique";
  affectedUserCount: number;
};

export async function createIncident(input: CreateIncidentInput): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("incident_log").insert({
    title: input.title,
    description: input.description,
    severity: input.severity,
    affected_user_count: input.affectedUserCount,
    created_by: user?.id,
  });

  return !error;
}
