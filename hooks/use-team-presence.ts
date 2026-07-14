"use client";

import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/lib/app-context";
import { useEffect, useState } from "react";

/**
 * Tracks which team members currently have this restaurant open, via a
 * Supabase Realtime Presence channel keyed by restaurant. Returns the set
 * of online user ids so the team list can show a live indicator.
 */
export function useTeamPresence(
  restaurantId: string | null,
  authUser: AuthUser | null
): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!restaurantId || !authUser) return;

    const supabase = createClient();
    const channel = supabase.channel(`presence:restaurant:${restaurantId}`, {
      config: { presence: { key: authUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: authUser.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      setOnlineIds(new Set());
    };
  }, [restaurantId, authUser?.id]);

  // Derived rather than reset via effect: masks any stale state the moment
  // the preconditions no longer hold, without a synchronous setState in the
  // effect body.
  return restaurantId && authUser ? onlineIds : new Set<string>();
}
