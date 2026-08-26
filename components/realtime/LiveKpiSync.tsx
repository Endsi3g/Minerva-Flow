"use client";

import { useLiveKpiSubscription } from "@/lib/realtime/RealtimeProvider";

/**
 * Subscribes to realtime changes on `service_days` and `financial_transactions`
 * via the unified restaurant realtime bus, debouncing route refreshes so KPI tiles
 * and charts built from server-fetched data stay live without duplicate WebSocket channels.
 *
 * Mount once per page (e.g. Overview, Finance) that renders KPIs derived from
 * these tables. Renders nothing.
 */
export function LiveKpiSync({ restaurantId: _restaurantId }: { restaurantId?: string }) {
  useLiveKpiSubscription();
  return null;
}
