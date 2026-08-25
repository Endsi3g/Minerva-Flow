import { createClient } from "@/lib/supabase/server";
import { generateDemoSlug } from "@/lib/prospects/slug";
import type {
  Prospect,
  ProspectMenu,
  ProspectSourcePlatform,
  ProspectStatus,
  WebsiteAuditReport,
} from "@/lib/prospects/types";

type ProspectRow = {
  id: string;
  source_url: string;
  source_platform: ProspectSourcePlatform;
  restaurant_name: string;
  currency: string;
  detected_address: string | null;
  commission_rate_pct: number;
  assumed_monthly_orders: number;
  status: ProspectStatus;
  demo_slug: string | null;
  menu_json: ProspectMenu;
  notes: string | null;
  contact_name: string | null;
  demo_view_count: number;
  last_viewed_at: string | null;
  contacted_at: string | null;
  audit_report: WebsiteAuditReport | null;
  audit_generated_at: string | null;
  created_at: string;
  updated_at: string;
};

const PROSPECT_COLUMNS =
  "id, source_url, source_platform, restaurant_name, currency, detected_address, commission_rate_pct, assumed_monthly_orders, status, demo_slug, menu_json, notes, contact_name, demo_view_count, last_viewed_at, contacted_at, audit_report, audit_generated_at, created_at, updated_at";

function mapProspect(row: ProspectRow): Prospect {
  return {
    id: row.id,
    sourceUrl: row.source_url,
    sourcePlatform: row.source_platform,
    restaurantName: row.restaurant_name,
    currency: row.currency,
    detectedAddress: row.detected_address,
    commissionRatePct: Number(row.commission_rate_pct),
    assumedMonthlyOrders: row.assumed_monthly_orders,
    status: row.status,
    demoSlug: row.demo_slug,
    menu: row.menu_json ?? { categories: [] },
    notes: row.notes,
    contactName: row.contact_name,
    demoViewCount: row.demo_view_count,
    lastViewedAt: row.last_viewed_at,
    contactedAt: row.contacted_at,
    auditReport: row.audit_report,
    auditGeneratedAt: row.audit_generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProspects(): Promise<Prospect[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .select(PROSPECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as ProspectRow[]).map(mapProspect);
}

export async function getProspectById(id: string): Promise<Prospect | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .select(PROSPECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProspect(data as ProspectRow);
}

/** Public — used by the /demo/[slug] page, reachable without an admin session. */
export async function getProspectByDemoSlug(slug: string): Promise<Prospect | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .select(PROSPECT_COLUMNS)
    .eq("demo_slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapProspect(data as ProspectRow);
}

export async function incrementProspectDemoView(slug: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_prospect_demo_view", { p_slug: slug });
}

export type CreateProspectInput = {
  sourceUrl: string;
  sourcePlatform: ProspectSourcePlatform;
  restaurantName: string;
  currency: string;
  detectedAddress?: string;
  commissionRatePct: number;
  assumedMonthlyOrders: number;
  menu: ProspectMenu;
  contactName?: string | null;
};

export async function createProspect(input: CreateProspectInput): Promise<Prospect | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("prospects")
    .insert({
      created_by: user?.id ?? null,
      source_url: input.sourceUrl,
      source_platform: input.sourcePlatform,
      restaurant_name: input.restaurantName,
      currency: input.currency,
      detected_address: input.detectedAddress || null,
      commission_rate_pct: input.commissionRatePct,
      assumed_monthly_orders: input.assumedMonthlyOrders,
      status: "ready",
      demo_slug: generateDemoSlug(input.restaurantName),
      menu_json: input.menu,
      contact_name: input.contactName || null,
    })
    .select(PROSPECT_COLUMNS)
    .single();

  if (error || !data) return null;
  return mapProspect(data as ProspectRow);
}

export async function updateProspectMenu(id: string, menu: ProspectMenu): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospects")
    .update({ menu_json: menu, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

export type UpdateProspectMetaInput = {
  restaurantName: string;
  currency: string;
  detectedAddress: string | null;
  commissionRatePct: number;
  assumedMonthlyOrders: number;
  notes: string | null;
  contactName?: string | null;
};

export async function updateProspectMeta(id: string, input: UpdateProspectMetaInput): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospects")
    .update({
      restaurant_name: input.restaurantName,
      currency: input.currency,
      detected_address: input.detectedAddress || null,
      commission_rate_pct: input.commissionRatePct,
      assumed_monthly_orders: input.assumedMonthlyOrders,
      notes: input.notes || null,
      contact_name: input.contactName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  return !error;
}

export async function updateProspectStatus(id: string, status: ProspectStatus): Promise<boolean> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "contacte" || status === "audit_envoye" || status === "relance_1" || status === "relance_2") {
    patch.contacted_at = new Date().toISOString();
  }
  const { error } = await supabase.from("prospects").update(patch).eq("id", id);
  return !error;
}

export async function saveProspectAudit(id: string, report: WebsiteAuditReport): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospects")
    .update({ audit_report: report, audit_generated_at: report.fetchedAt })
    .eq("id", id);
  return !error;
}

/**
 * Identifie les prospects nécessitant une relance selon la cadence recommandée :
 * - J+2 après audit_envoye / contacte -> Prêt pour Relance 1 (Rentabilité/Marges)
 * - J+3 après Relance 1 -> Prêt pour Relance 2 (Démo interactive/Fermeture)
 */
export async function getProspectsDueForFollowup(): Promise<{ prospect: Prospect; suggestedStep: 1 | 2; daysSinceContact: number }[]> {
  const prospects = await getProspects();
  const now = Date.now();
  const results: { prospect: Prospect; suggestedStep: 1 | 2; daysSinceContact: number }[] = [];

  for (const p of prospects) {
    if (p.status === "converti" || p.status === "decline" || p.status === "rdv_fixe") continue;

    const lastContact = p.contactedAt ? new Date(p.contactedAt).getTime() : p.createdAt ? new Date(p.createdAt).getTime() : null;
    if (!lastContact) continue;

    const daysSince = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));

    if ((p.status === "audit_envoye" || p.status === "contacte") && daysSince >= 2) {
      results.push({ prospect: p, suggestedStep: 1, daysSinceContact: daysSince });
    } else if (p.status === "relance_1" && daysSince >= 3) {
      results.push({ prospect: p, suggestedStep: 2, daysSinceContact: daysSince });
    }
  }

  return results;
}

export async function recordProspectFollowup(id: string, step: 1 | 2, noteAppend?: string): Promise<boolean> {
  const supabase = await createClient();
  const current = await getProspectById(id);
  if (!current) return false;

  const nextStatus: ProspectStatus = step === 1 ? "relance_1" : "relance_2";
  const nowIso = new Date().toISOString();
  const stepLabel = step === 1 ? "Relance 1 (Rentabilité)" : "Relance 2 (Démo)";
  const newNotes = [current.notes, `[${nowIso.slice(0, 10)}] ${stepLabel}${noteAppend ? ` : ${noteAppend}` : ""}`]
    .filter(Boolean)
    .join("\n");

  const { error } = await supabase
    .from("prospects")
    .update({
      status: nextStatus,
      contacted_at: nowIso,
      notes: newNotes,
      updated_at: nowIso,
    })
    .eq("id", id);

  return !error;
}
