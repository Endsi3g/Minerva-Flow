"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "@/i18n/navigation";
import { useApp } from "@/lib/app-context";
import { NAV_ITEMS } from "@/lib/nav-items";

export type PresenceMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  pageLabel: string;
};

type PresenceContextValue = {
  members: PresenceMember[];
  setDetail: (detail: string | null) => void;
};

const PresenceContext = createContext<PresenceContextValue>({ members: [], setDetail: () => {} });

/** Read-only: everyone currently connected to this restaurant, including yourself. */
export function usePresenceMembers(): PresenceMember[] {
  return useContext(PresenceContext).members;
}

/**
 * A page calls this to replace the generic page-name label ("Menu") with
 * something specific ("Plat : Poutine") for the duration it's mounted —
 * clears back to the generic label on unmount/navigation away.
 */
export function usePresenceDetail(detail: string | null) {
  const { setDetail } = useContext(PresenceContext);
  useEffect(() => {
    setDetail(detail);
    return () => setDetail(null);
  }, [detail, setDetail]);
}

/** Longest-href-match against the canonical nav list — same list the search suggestions use. */
function defaultPageLabel(pathname: string): string {
  const match = NAV_ITEMS.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)).sort(
    (a, b) => b.href.length - a.href.length
  )[0];
  return match?.title ?? "Minerva Flow";
}

/**
 * One Supabase Realtime Presence channel per restaurant, keyed by user id.
 * Kept alive across navigations (re-tracking on pathname/detail change
 * instead of resubscribing) so other members don't see you flicker
 * offline/online on every click. Powers the avatar stack in the topbar.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { restaurantId, authUser } = useApp();
  const pathname = usePathname();
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!restaurantId || !authUser) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence-${restaurantId}`, {
      config: { presence: { key: authUser.id } },
    });
    channelRef.current = channel;
    subscribedRef.current = false;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceMember>();
      setMembers(Object.values(state).flatMap((entries) => entries as unknown as PresenceMember[]));
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        channel.track({
          userId: authUser.id,
          name: authUser.fullName || authUser.email,
          avatarUrl: authUser.avatarUrl ?? null,
          pageLabel: detail ?? defaultPageLabel(pathname),
        });
      }
    });

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, authUser?.id]);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !subscribedRef.current || !authUser) return;
    channel.track({
      userId: authUser.id,
      name: authUser.fullName || authUser.email,
      avatarUrl: authUser.avatarUrl ?? null,
      pageLabel: detail ?? defaultPageLabel(pathname),
    });
  }, [pathname, detail, authUser]);

  return <PresenceContext.Provider value={{ members, setDetail }}>{children}</PresenceContext.Provider>;
}
