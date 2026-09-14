import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import type { SupportCategory } from "@/lib/data/support";
import {
  getRetentionFunnelMetrics,
  getShareableMetrics,
  type RetentionTimeRange,
  type ShareableMetric,
  type ShareableMetricId,
} from "@/lib/data/retention-metrics";

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  return (data as { is_platform_admin: boolean } | null)?.is_platform_admin ?? false;
}

export type AdminRestaurant = {
  id: string;
  name: string;
  city: string;
  createdAt: string;
  memberCount: number;
};

/**
 * Relies on the restaurants_admin_select RLS policy (is_platform_admin())
 * rather than the service-role client — this stays RLS-gated the same way
 * every other query in the app is, instead of being a special bypass path.
 */
export async function getAllRestaurantsForAdmin(): Promise<AdminRestaurant[]> {
  const supabase = await createClient();
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, city, created_at")
    .order("created_at", { ascending: false });

  if (error || !restaurants) return [];

  const { data: members } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("status", "active");

  const countByRestaurant = new Map<string, number>();
  for (const m of (members as { restaurant_id: string }[]) ?? []) {
    countByRestaurant.set(m.restaurant_id, (countByRestaurant.get(m.restaurant_id) ?? 0) + 1);
  }

  return (restaurants as { id: string; name: string; city: string | null; created_at: string }[]).map(
    (r) => ({
      id: r.id,
      name: r.name,
      city: r.city ?? "—",
      createdAt: r.created_at,
      memberCount: countByRestaurant.get(r.id) ?? 0,
    })
  );
}

export type AdminSupportRequest = {
  id: string;
  restaurantId: string | null;
  userEmail: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: "nouveau" | "en_cours" | "resolu";
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
};

export async function getAllSupportRequestsForAdmin(): Promise<AdminSupportRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as {
    id: string;
    restaurant_id: string | null;
    user_id: string;
    category: SupportCategory;
    subject: string;
    message: string;
    status: "nouveau" | "en_cours" | "resolu";
    admin_reply: string | null;
    replied_at: string | null;
    created_at: string;
  }[];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
  const emailById = new Map(
    ((profiles as { id: string; email: string | null }[]) ?? []).map((p) => [p.id, p.email ?? "—"])
  );

  return rows.map((r) => ({
    id: r.id,
    restaurantId: r.restaurant_id,
    userEmail: emailById.get(r.user_id) ?? "—",
    category: r.category,
    subject: r.subject,
    message: r.message,
    status: r.status,
    adminReply: r.admin_reply,
    repliedAt: r.replied_at,
    createdAt: r.created_at,
  }));
}

export async function replySupportRequest(
  id: string,
  reply: string,
  status: "en_cours" | "resolu"
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("support_requests")
    .update({ admin_reply: reply, replied_at: new Date().toISOString(), replied_by: user.id, status })
    .eq("id", id);

  return !error;
}

const SUMMED_METRIC_IDS: ShareableMetricId[] = [
  "new_members_in_range",
  "total_members",
  "campaign_attributed_revenue",
];

/**
 * Platform-wide rollup of the shareable results-card metrics, aggregated
 * across every restaurant. Counts/revenue are summed; rates and averages are
 * weighted by each restaurant's total member count. Admin-only (relies on
 * getAllRestaurantsForAdmin's RLS gate, same as the rest of this file).
 */
export async function getPlatformShareableMetrics(
  timeRange: RetentionTimeRange = "30d"
): Promise<ShareableMetric[] | null> {
  if (!(await isPlatformAdmin())) return null;

  const restaurants = await getAllRestaurantsForAdmin();
  if (restaurants.length === 0) return [];

  const perRestaurant = await Promise.all(
    restaurants.map(async (r) => {
      const dashboard = await getRetentionFunnelMetrics(r.id, timeRange);
      return getShareableMetrics(dashboard);
    })
  );

  const weightOf = (metrics: ShareableMetric[]) =>
    Math.max(1, metrics.find((m) => m.id === "total_members")?.value ?? 1);

  const ids = perRestaurant[0]?.map((m) => m.id) ?? [];

  return ids.map((id) => {
    const template = perRestaurant[0].find((m) => m.id === id)!;

    if (SUMMED_METRIC_IDS.includes(id)) {
      const value = perRestaurant.reduce(
        (sum, metrics) => sum + (metrics.find((m) => m.id === id)?.value ?? 0),
        0
      );
      return { ...template, value, formattedValue: formatShareableValue(id, value, template.unit) };
    }

    let weightedSum = 0;
    let totalWeight = 0;
    for (const metrics of perRestaurant) {
      const metric = metrics.find((m) => m.id === id);
      if (!metric) continue;
      const weight = weightOf(metrics);
      weightedSum += metric.value * weight;
      totalWeight += weight;
    }
    const value = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
    return { ...template, value, formattedValue: formatShareableValue(id, value, template.unit) };
  });
}

function formatShareableValue(id: ShareableMetricId, value: number, unit: ShareableMetric["unit"]): string {
  if (unit === "%") return `${value.toFixed(1)} %`;
  if (unit === "visites") return `${value.toFixed(1)} visites`;
  if (unit === "$") return formatCurrency(value);
  return `${Math.round(value)}`;
}
