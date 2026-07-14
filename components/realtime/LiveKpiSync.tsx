"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Subscribes to realtime changes on `service_days` and `financial_transactions`
 * for the current restaurant, and refreshes the current route's server data
 * (router.refresh()) whenever a row is inserted/updated/deleted — so KPI tiles
 * and charts built from server-fetched data stay live without a manual reload.
 *
 * Mount once per page (e.g. Overview, Finance) that renders KPIs derived from
 * these tables. Renders nothing.
 */
export function LiveKpiSync({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`live-kpi-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_days",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "financial_transactions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  return null;
}
