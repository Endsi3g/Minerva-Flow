"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

type State = "connecting" | "live" | "reconnecting" | "offline";

/** Customer-portal channel: row access is still enforced by customer RLS. */
export function PortalRealtimeSync({ customerId, restaurantId }: { customerId: string; restaurantId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("connecting");

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 500);
    };
    const onNetworkChange = () => setState(navigator.onLine ? "reconnecting" : "offline");
    const channel = supabase
      .channel(`customer-portal-${customerId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "customers", filter: `id=eq.${customerId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "loyalty_transactions", filter: `customer_id=eq.${customerId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reward_redemptions", filter: `customer_id=eq.${customerId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `customer_id=eq.${customerId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `customer_id=eq.${customerId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_status_events", filter: `restaurant_id=eq.${restaurantId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "offers", filter: `restaurant_id=eq.${restaurantId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "offers", filter: `restaurant_id=eq.${restaurantId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "menu_items", filter: `restaurant_id=eq.${restaurantId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "menu_items", filter: `restaurant_id=eq.${restaurantId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "loyalty_rewards", filter: `restaurant_id=eq.${restaurantId}` }, refresh)
      .subscribe((status) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          setState("live");
          refresh();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setState(navigator.onLine ? "reconnecting" : "offline");
        }
      });
    window.addEventListener("online", onNetworkChange);
    window.addEventListener("offline", onNetworkChange);
    return () => {
      disposed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener("online", onNetworkChange);
      window.removeEventListener("offline", onNetworkChange);
      void supabase.removeChannel(channel);
    };
  }, [customerId, restaurantId, router]);

  const labels: Record<State, string> = {
    connecting: "Connexion en direct…",
    live: "Données à jour",
    reconnecting: "Reconnexion…",
    offline: "Hors ligne · les données seront actualisées au retour du réseau",
  };
  const tone = state === "live" ? "bg-emerald-600" : state === "offline" ? "bg-red-500" : "bg-amber-500 animate-pulse";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-mv-border-soft bg-mv-surface px-2 py-1 text-[12px] font-medium text-mv-ink-soft" role="status" aria-live="polite" title={labels[state]}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone)} />
      <Radio size={11} aria-hidden="true" />
      <span className="hidden xs:inline">{state === "live" ? "En direct" : labels[state]}</span>
      <span className="sr-only">{labels[state]}</span>
    </span>
  );
}
