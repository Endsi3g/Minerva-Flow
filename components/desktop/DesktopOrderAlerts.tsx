"use client";

import { useEffect } from "react";
import { useRealtimeBus } from "@/lib/realtime/RealtimeProvider";
import { isDesktopApp, notifyDesktop } from "@/lib/desktop/bridge";
import { playOrderChime, readStationPrefs } from "@/lib/desktop/prefs";

/**
 * In the desktop app, every new order plays a chime and raises a system
 * notification, even when the window is in the background. Mounted inside the
 * shell so it shares the single realtime channel.
 */
export function DesktopOrderAlerts() {
  const { subscribeChanges } = useRealtimeBus();

  useEffect(() => {
    if (!isDesktopApp()) return;
    return subscribeChanges((event) => {
      if (event.table !== "orders" || event.eventType !== "INSERT") return;
      if (!readStationPrefs().orderAlert) return;
      playOrderChime();
      void notifyDesktop("Nouvelle commande", "Une commande vient d'arriver dans Minerva Flow.");
    });
  }, [subscribeChanges]);

  return null;
}
