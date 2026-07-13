"use client";

import { Badge } from "@/components/ui/Badge";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
} from "@/components/ui/map";
import { restaurants } from "@/lib/mock-data";
import { useApp } from "@/lib/app-context";
import { formatCurrency } from "@/lib/utils";

const revenueByRestaurant: Record<string, { revenue: number; delta: number }> = {
  r1: { revenue: 78700, delta: 8.4 },
  r2: { revenue: 61200, delta: 4.1 },
  r3: { revenue: 42950, delta: -2.3 },
};

export default function MapsPage() {
  const { restaurantId, setRestaurantId } = useApp();

  return (
    <div className="relative flex-1">
      <Map center={[3.8, 46.2]} zoom={5.2} theme="light">
        <MapControls position="top-right" showZoom showFullscreen />
        {restaurants.map((r) => {
          const stats = revenueByRestaurant[r.id];
          const active = r.id === restaurantId;
          return (
            <MapMarker key={r.id} longitude={r.lng} latitude={r.lat}>
              <MarkerContent>
                <button
                  onClick={() => setRestaurantId(r.id)}
                  className="flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-lg transition-transform hover:scale-110"
                  style={{ background: r.color, outline: active ? "3px solid var(--mv-lime)" : "none" }}
                >
                  {r.city[0]}
                </button>
                <MarkerLabel position="bottom">{r.city}</MarkerLabel>
              </MarkerContent>
              <MarkerPopup className="w-64 p-4">
                <p className="font-display text-[15px] font-medium text-mv-ink">{r.name}</p>
                <p className="mt-0.5 text-[12px] text-mv-ink-faint">
                  {r.address}, {r.city}
                </p>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-mv-cream-soft p-2.5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">
                      Revenu (mois)
                    </p>
                    <p className="font-display text-[16px] font-medium text-mv-green-dark">
                      {formatCurrency(stats.revenue)}
                    </p>
                  </div>
                  <Badge tone={stats.delta >= 0 ? "green" : "red"}>
                    {stats.delta >= 0 ? "↑" : "↓"} {Math.abs(stats.delta).toFixed(1)}%
                  </Badge>
                </div>
              </MarkerPopup>
            </MapMarker>
          );
        })}
      </Map>

      <div className="absolute left-4 top-4 z-10 w-64 rounded-2xl border border-mv-border bg-mv-surface/95 p-4 shadow-mv-lg backdrop-blur-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Établissements
        </p>
        <div className="space-y-2">
          {restaurants.map((r) => {
            const stats = revenueByRestaurant[r.id];
            const active = r.id === restaurantId;
            return (
              <button
                key={r.id}
                onClick={() => setRestaurantId(r.id)}
                className={
                  active
                    ? "flex w-full items-center justify-between rounded-lg bg-mv-green-tint px-2.5 py-2 text-left transition-colors"
                    : "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-mv-cream-soft"
                }
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="text-[12.5px] font-semibold text-mv-ink">{r.city}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-mv-ink-soft">
                    {formatCurrency(stats.revenue)}
                  </span>
                  <Badge tone={stats.delta >= 0 ? "green" : "red"} className="px-1.5 py-0.5 text-[10px]">
                    {stats.delta >= 0 ? "↑" : "↓"}
                    {Math.abs(stats.delta).toFixed(1)}%
                  </Badge>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
