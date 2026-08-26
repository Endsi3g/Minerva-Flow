import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportDef } from "@/lib/reports";
import type { FlowLine } from "@/lib/types";

export type ReportShareSnapshot = {
  report: ReportDef;
  trend: { date: string; revenue: number }[];
  breakdown: FlowLine[];
};

export type ReportShare = {
  token: string;
  title: string;
  createdAt: string;
  snapshot: ReportShareSnapshot;
  watermark: boolean;
  expiresAt: string | null;
  expired: boolean;
};

export type ReportShareOptions = {
  /** Defaults to true — recommended for anything shared outside the team. */
  watermark?: boolean;
  /** Days until the link stops working, or null for "never". */
  expiresInDays?: number | null;
};

/**
 * Snapshots the report at share time and stores it, rather than
 * recomputing live on every visit — an anonymous visitor has no RLS
 * session, so a stored snapshot avoids needing restaurant-scoped queries
 * on the public path entirely.
 */
export async function createReportShare(
  restaurantId: string,
  reportSlug: string,
  snapshot: ReportShareSnapshot,
  options?: ReportShareOptions
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const token = randomUUID().replace(/-/g, "");
  const expiresAt =
    options?.expiresInDays != null ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString() : null;

  const { error } = await supabase.from("report_shares").insert({
    restaurant_id: restaurantId,
    report_slug: reportSlug,
    token,
    title: snapshot.report.label,
    data: snapshot,
    created_by: user.id,
    watermark: options?.watermark ?? true,
    expires_at: expiresAt,
  });
  if (error) return null;

  return token;
}

/**
 * Expiry is enforced here, not via an RLS policy: the public /r/[token]
 * lookup already bypasses RLS entirely (anonymous visitors have no
 * restaurant-scoped session) by reading through the admin client.
 */
export async function getReportShareByToken(token: string): Promise<ReportShare | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("report_shares")
    .select("token, title, data, created_at, watermark, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = data.expires_at as string | null;

  return {
    token: data.token,
    title: data.title,
    createdAt: data.created_at,
    snapshot: data.data as ReportShareSnapshot,
    watermark: data.watermark ?? true,
    expiresAt,
    expired: Boolean(expiresAt && new Date(expiresAt) < new Date()),
  };
}
