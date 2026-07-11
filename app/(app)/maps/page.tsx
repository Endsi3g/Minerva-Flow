"use client";

import { PageHeader } from "@/components/ui/PageHeader";
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
    <div>
      <PageHeader
        eyebrow="Vue géographique"
        title="Maps"
        description="Vos établissements, situés — cliquez un marqueur pour changer de restaurant actif."
      />

      <div className="overflow-hidden rounded-2xl border border-mv-border shadow-mv-sm">
        <div className="h-[560px] w-full">
          <Map center={[3.8, 46.2]} zoom={5.2}>
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
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {restaurants.map((r) => {
          const stats = revenueByRestaurant[r.id];
          return (
            <button
              key={r.id}
              onClick={() => setRestaurantId(r.id)}
              className="rounded-2xl border border-mv-border bg-mv-surface p-4 text-left shadow-mv-sm transition-all hover:-translate-y-0.5 hover:shadow-mv-md"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                <p className="font-display text-[14.5px] font-medium text-mv-ink">{r.city}</p>
              </div>
              <p className="mt-2 font-display text-[20px] font-medium text-mv-ink">
                {formatCurrency(stats.revenue)}
              </p>
              <Badge tone={stats.delta >= 0 ? "green" : "red"} className="mt-2">
                {stats.delta >= 0 ? "↑" : "↓"} {Math.abs(stats.delta).toFixed(1)}%
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
