"use server";

import { createClient } from "@/lib/supabase/server";

export type StartupProgress = {
  serviceDaysCount: number;
  memberCount: number;
};

/**
 * Lightweight counts (not full row fetches) backing the startup checklist —
 * every item is derived from data that already exists, no separate
 * "progress" table to keep in sync.
 */
export async function getStartupProgressAction(restaurantId: string): Promise<StartupProgress> {
  if (!restaurantId) return { serviceDaysCount: 0, memberCount: 0 };

  const supabase = await createClient();
  const [serviceDays, members] = await Promise.all([
    supabase
      .from("service_days")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),
    supabase
      .from("restaurant_members")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("status", "active"),
  ]);

  return {
    serviceDaysCount: serviceDays.count ?? 0,
    memberCount: members.count ?? 0,
  };
}
