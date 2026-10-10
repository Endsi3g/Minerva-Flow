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
  const [presence, setPresence] = useState<{ key: string; members: PresenceMember[] } | null>(null);

  useEffect(() => {
    if (!restaurantId || !authUser) return;
    const presenceKey = `${restaurantId}:${authUser.id}`;

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
        setPresence({ key: presenceKey, members: others });
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
  }, [restaurantId, authUser]);

  const currentKey = authUser ? `${restaurantId}:${authUser.id}` : null;
  return currentKey && presence?.key === currentKey ? presence.members : [];
}
