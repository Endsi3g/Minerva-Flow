"use server";

import { createClient } from "@/lib/supabase/server";

export type StartupProgress = {
  serviceDaysCount: number;
  memberCount: number;
  hasAddress: boolean;
  toolsConnectedCount: number;
  /** Published (non-draft, active) menu items: the first step of getting customers. */
  liveMenuCount: number;
  /** Customers enrolled in the loyalty programme. */
  customerCount: number;
};

/**
 * Lightweight counts (not full row fetches) backing the startup checklist —
 * every item is derived from data that already exists, no separate
 * "progress" table to keep in sync. hasAddress/toolsConnectedCount back the
 * two items that moved here from the old 6-step onboarding wizard (address,
 * connect tools) once that wizard was condensed to a single step.
 */
export async function getStartupProgressAction(restaurantId: string): Promise<StartupProgress> {
  if (!restaurantId) return { serviceDaysCount: 0, memberCount: 0, hasAddress: false, toolsConnectedCount: 0, liveMenuCount: 0, customerCount: 0 };

  const supabase = await createClient();
  const [serviceDays, members, restaurantRow, posConnections, adConnections, liveMenu, customers] = await Promise.all([
    supabase
      .from("service_days")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),
    supabase
      .from("restaurant_members")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("status", "active"),
    supabase.from("restaurants").select("address").eq("id", restaurantId).maybeSingle(),
    supabase
      .from("pos_connections")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("status", "connecte"),
    supabase
      .from("ad_platform_connections")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("status", "connecte"),
    supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("active", true)
      .eq("is_draft", false),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),
  ]);

  return {
    serviceDaysCount: serviceDays.count ?? 0,
    memberCount: members.count ?? 0,
    hasAddress: Boolean((restaurantRow.data as { address: string | null } | null)?.address),
    toolsConnectedCount: (posConnections.count ?? 0) + (adConnections.count ?? 0),
    liveMenuCount: liveMenu.count ?? 0,
    customerCount: customers.count ?? 0,
  };
}
