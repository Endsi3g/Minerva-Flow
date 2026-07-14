"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

export type ActivityLogRow = {
  id: string;
  restaurant_id: string;
  actor_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  created_at: string;
};

/**
 * Subscribes to new activity_log rows via Supabase Realtime (Postgres
 * Changes) filtered on a single column, and invokes onInsert for each row
 * as it arrives. The replicated row doesn't carry the actor's display name
 * (no join at the Realtime layer) — callers already know it from context
 * (the member/profile they're viewing) and can fill it in themselves.
 */
export function useActivityLogRealtime(
  filterColumn: "restaurant_id" | "actor_id",
  filterValue: string | null | undefined,
  onInsert: (row: ActivityLogRow) => void
) {
  const onInsertRef = useRef(onInsert);
  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    if (!filterValue) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`activity_log:${filterColumn}:${filterValue}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload) => onInsertRef.current(payload.new as ActivityLogRow)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterColumn, filterValue]);
}
