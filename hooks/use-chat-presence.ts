"use client";

import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/lib/app-context";
import { useEffect, useState } from "react";

export type PresenceMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

/**
 * Tracks who else currently has the AI chat open for this restaurant, via a
 * Supabase Realtime Presence channel (not Postgres Changes — no chat table
 * is replicated). First use of Supabase Realtime in the codebase.
 */
export function useChatPresence(restaurantId: string, authUser: AuthUser | null): PresenceMember[] {
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    if (!restaurantId || !authUser) {
      setMembers([]);
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`presence:restaurant:${restaurantId}:assistant`, {
      config: { presence: { key: authUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string; avatarUrl: string | null }>();
        const others = Object.entries(state)
          .filter(([userId]) => userId !== authUser.id)
          .map(([userId, presences]) => ({
            userId,
            name: presences[0]?.name ?? "—",
            avatarUrl: presences[0]?.avatarUrl ?? null,
          }));
        setMembers(others);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: authUser.fullName, avatarUrl: authUser.avatarUrl ?? null });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [restaurantId, authUser?.id, authUser?.fullName, authUser?.avatarUrl]);

  return members;
}
