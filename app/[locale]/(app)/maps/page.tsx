"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  useMap,
} from "@/components/ui/map";
import { useApp } from "@/lib/app-context";
import { formatCurrency } from "@/lib/utils";
import { BarListCard } from "@/components/minerva/BarListCard";
import { getRevenueByRestaurantAction, geocodeRestaurantIfMissingAction } from "./actions";
import type { Restaurant } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, Navigation, ChevronRight, X, TrendingUp } from "lucide-react";
import Link from "next/link";

function RestaurantMarker({
  restaurant,
  stats,
  active,
  onSelect,
}: {
  restaurant: Restaurant & { lng: number; lat: number };
  stats: { revenue: number; delta: number };
  active: boolean;
  onSelect: () => void;
}) {
  const { map } = useMap();

  function handleCenter() {
    map?.flyTo({ center: [restaurant.lng, restaurant.lat], zoom: 14 });
  }

  function handleDirections() {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const monogram = (restaurant.name || restaurant.city || "EF").slice(0, 2).toUpperCase();

  return (
    <MapMarker longitude={restaurant.lng} latitude={restaurant.lat}>
      <MarkerContent>
        <button
          onClick={onSelect}
          className="flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-lg transition-transform hover:scale-110"
          style={{
            background: restaurant.color || "var(--mv-green)",
            outline: active ? "3px solid var(--mv-lime)" : "none",
          }}
        >
          {monogram}
        </button>
        <MarkerLabel position="bottom" className="font-semibold text-mv-ink drop-shadow-xs">
          {restaurant.name}
        </MarkerLabel>
      </MarkerContent>
      <MarkerPopup className="w-64 p-4">
        <p className="font-display text-[15px] font-medium text-mv-ink">{restaurant.name}</p>
        <p className="mt-0.5 text-[12px] text-mv-ink-faint">
          {restaurant.address ? `${restaurant.address}, ` : ""}{restaurant.city}
        </p>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-mv-cream-soft p-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Revenu (mois)</p>
            <p className="font-display text-[16px] font-medium text-mv-green-dark">
              {formatCurrency(stats.revenue)}
            </p>
          </div>
          <Badge tone={stats.delta >= 0 ? "green" : "red"}>
            {stats.delta >= 0 ? "↑" : "↓"} {Math.abs(stats.delta).toFixed(1)}%
          </Badge>
        </div>
        <div className="mt-3 flex gap-1.5">
          <Button variant="secondary" size="sm" className="flex-1" onClick={handleCenter}>
            <LocateFixed data-icon="inline-start" />
            Centrer
          </Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={handleDirections}>
            <Navigation data-icon="inline-start" />
            Itinéraire
          </Button>
        </div>
        <Link
          href={`/etablissements/${restaurant.id}`}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-mv-border px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
        >
          Voir la fiche complète <ChevronRight size={13} />
        </Link>
      </MarkerPopup>
    </MapMarker>
  );
}

const GLOBAL_STATS_DISMISS_KEY = "mv-maps-global-stats-dismissed";

function GlobalStatsCard({
  restaurantCount,
  totalRevenue,
  avgDelta,
}: {
  restaurantCount: number;
  totalRevenue: number;
  avgDelta: number;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(GLOBAL_STATS_DISMISS_KEY) === "1");
  }, []);

  if (dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(GLOBAL_STATS_DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 w-64 rounded-2xl border border-mv-border bg-mv-surface/95 p-4 shadow-mv-lg backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Statistiques globales
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Retirer cette carte"
          className="rounded-md p-1 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
        >
          <X size={13} />
        </button>
      </div>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-mv-ink-soft">Établissements</span>
          <span className="text-[13px] font-semibold text-mv-ink">{restaurantCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-mv-ink-soft">Revenu total (mois)</span>
          <span className="text-[13px] font-semibold text-mv-ink">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[12px] text-mv-ink-soft">
            <TrendingUp size={12} /> Delta moyen
          </span>
          <Badge tone={avgDelta >= 0 ? "green" : "red"} className="px-1.5 py-0.5 text-[10px]">
            {avgDelta >= 0 ? "↑" : "↓"} {Math.abs(avgDelta).toFixed(1)}%
          </Badge>
        </div>
      </div>
    </div>
  );
}

/** Fits all establishment locations in view automatically on load */
function FitAllBounds({ restaurants }: { restaurants: { lng: number; lat: number }[] }) {
  const { map } = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!map || restaurants.length === 0 || fittedRef.current) return;
    if (restaurants.length === 1) {
      map.flyTo({ center: [restaurants[0].lng, restaurants[0].lat], zoom: 13 });
      fittedRef.current = true;
      return;
    }

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const r of restaurants) {
      if (r.lng < minLng) minLng = r.lng;
      if (r.lng > maxLng) maxLng = r.lng;
      if (r.lat < minLat) minLat = r.lat;
      if (r.lat > maxLat) maxLat = r.lat;
    }

    try {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: { top: 70, bottom: 70, left: 320, right: 70 }, maxZoom: 13, duration: 1200 }
      );
      fittedRef.current = true;
    } catch {
      // MapLibreGL may not be fully initialized yet
    }
  }, [map, restaurants]);

  return null;
}

/** Flies to a restaurant's pin whenever the selection changes (list click, marker click, or a coordinate backfill resolving for the first time). */
function FlyToRestaurant({ id, lng, lat }: { id: string; lng: number; lat: number }) {
  const { map } = useMap();
  const lastFlownId = useRef<string | null>(null);

  useEffect(() => {
    if (!map || lastFlownId.current === id) return;
    lastFlownId.current = id;
    map.flyTo({ center: [lng, lat], zoom: 14, duration: 1200 });
  }, [map, id, lng, lat]);

  return null;
}

function EstablishmentsMode() {
  const { restaurantId, setRestaurantId, restaurants } = useApp();
  const [backfilled, setBackfilled] = useState<Record<string, { lng: number; lat: number }>>({});
  const [revenueByRestaurant, setRevenueByRestaurant] = useState<
    Record<string, { revenue: number; delta: number }>
  >({});

  const positioned = restaurants.map((r) => ({
    ...r,
    lng: r.lng ?? backfilled[r.id]?.lng ?? null,
    lat: r.lat ?? backfilled[r.id]?.lat ?? null,
  }));
  const geoRestaurants = positioned.filter(
    (r): r is typeof r & { lng: number; lat: number } => r.lng !== null && r.lat !== null
  );
  const current = geoRestaurants.find((r) => r.id === restaurantId);

  useEffect(() => {
    const ids = restaurants.map((r) => r.id);
    if (ids.length === 0) return;
    getRevenueByRestaurantAction(ids).then(setRevenueByRestaurant);
  }, [restaurants]);

  // Lazily geocode any restaurant that has an address or city but never got a pin
  useEffect(() => {
    for (const r of restaurants) {
      if (r.lng !== null || r.lat !== null || (!r.address && !r.city)) continue;
      geocodeRestaurantIfMissingAction(r.id).then((coords) => {
        if (coords) setBackfilled((prev) => ({ ...prev, [r.id]: coords }));
      });
    }
  }, [restaurants]);

  const allStats = Object.values(revenueByRestaurant);
  const totalRevenue = allStats.reduce((sum, s) => sum + s.revenue, 0);
  const avgDelta = allStats.length > 0 ? allStats.reduce((sum, s) => sum + s.delta, 0) / allStats.length : 0;

  return (
    <>
      <Map
        className="flex-1 min-h-0"
        center={current ? [current.lng, current.lat] : [-73.5673, 45.5017]}
        zoom={current ? 14 : 11}
        theme="light"
      >
        <MapControls position="bottom-right" showZoom showFullscreen />
        <FitAllBounds restaurants={geoRestaurants} />
        {current && <FlyToRestaurant id={current.id} lng={current.lng} lat={current.lat} />}
        {geoRestaurants.map((r) => {
          const stats = revenueByRestaurant[r.id] ?? { revenue: 0, delta: 0 };
          const active = r.id === restaurantId;
          return (
            <RestaurantMarker
              key={r.id}
              restaurant={r}
              stats={stats}
              active={active}
              onSelect={() => setRestaurantId(r.id)}
            />
          );
        })}
      </Map>

      <div className="md:absolute static mb-4 md:mb-0 md:left-4 md:top-4 z-10 w-full md:w-80 rounded-2xl border border-mv-border bg-mv-surface/95 p-4 shadow-mv-lg backdrop-blur-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Établissements & Localisations
        </p>
        <div className="space-y-2">
          {restaurants.map((r) => {
            const stats = revenueByRestaurant[r.id] ?? { revenue: 0, delta: 0 };
            const active = r.id === restaurantId;
            return (
              <button
                key={r.id}
                onClick={() => setRestaurantId(r.id)}
                className={
                  active
                    ? "flex w-full items-center justify-between rounded-xl bg-mv-green-tint p-2.5 text-left transition-colors border border-mv-green/30"
                    : "flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors hover:bg-mv-cream-soft border border-transparent"
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-mv-border"
                    style={{ background: r.color || "var(--mv-green)" }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-mv-ink">{r.name}</p>
                    <p className="truncate text-[11px] text-mv-ink-faint">
                      {r.city ? `${r.city}` : "Emplacement"}
                      {r.address ? ` · ${r.address}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[12px] font-semibold text-mv-ink-soft">
                    {formatCurrency(stats.revenue)}
                  </span>
                  <Badge tone={stats.delta >= 0 ? "green" : "red"} className="px-1.5 py-0.5 text-[10px]">
                    {stats.delta >= 0 ? "↑" : "↓"}
                    {Math.abs(stats.delta).toFixed(1)}%
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <GlobalStatsCard
        restaurantCount={geoRestaurants.length}
        totalRevenue={totalRevenue}
        avgDelta={avgDelta}
      />

      <BarListCard
        eyebrow="Classement"
        title="Établissements par revenu"
        dismissKey="mv-maps-revenue-bars-dismissed"
        position="right-4 top-20"
        rows={(() => {
          const withRevenue = restaurants.map((r) => ({
            label: `${r.name}${r.city ? ` (${r.city})` : ""}`,
            revenue: revenueByRestaurant[r.id]?.revenue ?? 0,
          }));
          const max = Math.max(1, ...withRevenue.map((r) => r.revenue));
          return withRevenue
            .sort((a, b) => b.revenue - a.revenue)
            .map((r) => ({ label: r.label, value: formatCurrency(r.revenue), fraction: r.revenue / max }));
        })()}
      />
    </>
  );
}

export default function MapsPage() {
  const { setSidebarCollapsed } = useApp();

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  return (
    <div className="relative flex-1 min-h-[420px] md:h-full flex flex-col space-y-4 md:space-y-0">
      <EstablishmentsMode />
    </div>
  );
}
