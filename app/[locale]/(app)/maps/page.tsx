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
  MapClusterLayer,
  useMap,
} from "@/components/ui/map";
import { useApp } from "@/lib/app-context";
import { formatCurrency } from "@/lib/utils";
import { BarListCard } from "@/components/minerva/BarListCard";
import { getAdConversionsAction, getRevenueByRestaurantAction, geocodeRestaurantIfMissingAction } from "./actions";
import type { AdConversion, Restaurant } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPinned, Megaphone, LocateFixed, Navigation, ChevronRight, X, TrendingUp } from "lucide-react";
import Link from "next/link";

type FilterMode = "tous" | "organique" | "payant";

const filters: { id: FilterMode; label: string }[] = [
  { id: "tous", label: "Tout" },
  { id: "organique", label: "Organique" },
  { id: "payant", label: "Payant" },
];

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

  return (
    <MapMarker longitude={restaurant.lng} latitude={restaurant.lat}>
      <MarkerContent>
        <button
          onClick={onSelect}
          className="flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-lg transition-transform hover:scale-110"
          style={{
            background: restaurant.color,
            outline: active ? "3px solid var(--mv-lime)" : "none",
          }}
        >
          {restaurant.city[0]}
        </button>
        <MarkerLabel position="bottom">{restaurant.city}</MarkerLabel>
      </MarkerContent>
      <MarkerPopup className="w-64 p-4">
        <p className="font-display text-[15px] font-medium text-mv-ink">{restaurant.name}</p>
        <p className="mt-0.5 text-[12px] text-mv-ink-faint">
          {restaurant.address}, {restaurant.city}
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

/** Flies to a restaurant's pin whenever the selection changes (list click, marker click, or a coordinate backfill resolving for the first time). */
function FlyToRestaurant({ id, lng, lat }: { id: string; lng: number; lat: number }) {
  const { map } = useMap();
  const lastFlownId = useRef<string | null>(null);

  useEffect(() => {
    if (!map || lastFlownId.current === id) return;
    lastFlownId.current = id;
    map.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 });
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

  // Lazily geocode any restaurant that has an address but never got a pin
  // (created/edited before geocoding existed) — no need to re-save Workspace.
  useEffect(() => {
    for (const r of restaurants) {
      if (r.lng !== null || r.lat !== null || !r.address || !r.city) continue;
      geocodeRestaurantIfMissingAction(r.id).then((coords) => {
        if (coords) setBackfilled((prev) => ({ ...prev, [r.id]: coords }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurants]);

  const allStats = Object.values(revenueByRestaurant);
  const totalRevenue = allStats.reduce((sum, s) => sum + s.revenue, 0);
  const avgDelta = allStats.length > 0 ? allStats.reduce((sum, s) => sum + s.delta, 0) / allStats.length : 0;

  return (
    <>
      <Map
        center={current ? [current.lng, current.lat] : [-73.5673, 45.5017]}
        zoom={current ? 14 : 11}
        theme="light"
      >
        <MapControls position="bottom-right" showZoom showFullscreen />
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

      <div className="md:absolute static mb-4 md:mb-0 md:left-4 md:top-4 z-10 w-full md:w-64 rounded-2xl border border-mv-border bg-mv-surface/95 p-4 shadow-mv-lg backdrop-blur-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Établissements
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
            label: r.city || r.name,
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

const clusterColorsByFilter: Record<FilterMode, [string, string, string]> = {
  tous: ["#94a3b8", "#3b82f6", "#1d4ed8"],
  organique: ["#a7f3d0", "#34d399", "#059669"],
  payant: ["#fecaca", "#f87171", "#dc2626"],
};

function AttributionMode() {
  const { restaurantId, restaurants } = useApp();
  const current = restaurants.find((r) => r.id === restaurantId);
  const [filter, setFilter] = useState<FilterMode>("tous");
  const [conversions, setConversions] = useState<AdConversion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    getAdConversionsAction(restaurantId).then((data) => {
      setConversions(data);
      setLoading(false);
    });
  }, [restaurantId]);

  const filtered = useMemo(() => {
    if (filter === "tous") return conversions;
    if (filter === "organique") return conversions.filter((c) => c.channel === "organic");
    return conversions.filter((c) => c.channel === "meta" || c.channel === "google");
  }, [conversions, filter]);

  const geoConversions = filtered.filter(
    (c): c is AdConversion & { lng: number; lat: number } => c.lng !== null && c.lat !== null
  );

  const geoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: geoConversions.map((c) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
        properties: { id: c.id, channel: c.channel, city: c.city, revenue: c.revenue },
      })),
    }),
    [geoConversions]
  );

  const onlineShare =
    filtered.length > 0
      ? Math.round((filtered.filter((c) => c.convertedOnline).length / filtered.length) * 100)
      : 0;

  return (
    <>
      <Map
        blank
        center={current?.lng != null && current?.lat != null ? [current.lng, current.lat] : [-73.5673, 45.5017]}
        zoom={current?.lng != null ? 9 : 11}
        theme="light"
      >
        <MapControls position="bottom-right" showZoom showFullscreen />
        {geoConversions.length > 0 && (
          <MapClusterLayer data={geoJson} clusterColors={clusterColorsByFilter[filter]} />
        )}
      </Map>

      <div className="md:absolute static mb-4 md:mb-0 md:left-4 md:top-4 z-10 w-full md:w-64 rounded-2xl border border-mv-border bg-mv-surface/95 p-4 shadow-mv-lg backdrop-blur-sm">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Attribution publicitaire
        </p>
        <div className="mb-3 flex items-center rounded-lg border border-mv-border bg-mv-cream-soft p-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={
                filter === f.id
                  ? "flex-1 rounded-md bg-mv-surface px-2 py-1.5 text-[12px] font-semibold text-mv-ink shadow-mv-sm"
                  : "flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold text-mv-ink-soft"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-[12.5px] text-mv-ink-faint">Chargement…</p>
        ) : conversions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Megaphone size={20} className="text-mv-ink-faint" />
            <p className="text-[12.5px] text-mv-ink-soft">
              Connectez Meta Ads ou Google Ads dans Paramètres → Intégrations pour voir d&apos;où
              viennent vos clients.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg bg-mv-cream-soft p-2.5">
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">Conversions</p>
              <p className="font-display text-[16px] font-medium text-mv-ink">{filtered.length}</p>
            </div>
            <div className="rounded-lg bg-mv-cream-soft p-2.5">
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">
                Achats en ligne
              </p>
              <p className="font-display text-[16px] font-medium text-mv-ink">{onlineShare}%</p>
            </div>
          </div>
        )}
      </div>

      <BarListCard
        eyebrow="Classement"
        title="Sources d'attribution"
        dismissKey="mv-maps-attribution-bars-dismissed"
        position="right-4 top-20"
        rows={(() => {
          const channelLabel: Record<string, string> = { organic: "Organique", meta: "Meta Ads", google: "Google Ads" };
          const counts: Record<string, number> = {};
          for (const c of conversions) counts[c.channel] = (counts[c.channel] ?? 0) + 1;
          const entries = Object.entries(counts);
          const max = Math.max(1, ...entries.map(([, n]) => n));
          return entries
            .sort((a, b) => b[1] - a[1])
            .map(([channel, count]) => ({
              label: channelLabel[channel] ?? channel,
              value: String(count),
              fraction: count / max,
            }));
        })()}
      />
    </>
  );
}

export default function MapsPage() {
  const [mode, setMode] = useState<"establishments" | "attribution">("establishments");
  const { setSidebarCollapsed } = useApp();

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  return (
    <div className="relative flex-1 min-h-[420px] md:min-h-[calc(100vh-140px)] flex flex-col space-y-4 md:space-y-0">
      <div className="md:absolute static self-end md:right-4 md:top-4 z-10 flex items-center rounded-lg border border-mv-border bg-mv-surface/95 p-0.5 shadow-mv-lg backdrop-blur-sm">
        <button
          onClick={() => setMode("establishments")}
          className={
            mode === "establishments"
              ? "flex items-center gap-1.5 rounded-md bg-mv-green px-2.5 py-1.5 text-[12px] font-semibold text-mv-cream-soft"
              : "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-mv-ink-soft"
          }
        >
          <MapPinned size={13} /> Établissements
        </button>
        <button
          onClick={() => setMode("attribution")}
          className={
            mode === "attribution"
              ? "flex items-center gap-1.5 rounded-md bg-mv-green px-2.5 py-1.5 text-[12px] font-semibold text-mv-cream-soft"
              : "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-mv-ink-soft"
          }
        >
          <Megaphone size={13} /> Attribution
        </button>
      </div>

      {mode === "establishments" ? <EstablishmentsMode /> : <AttributionMode />}
    </div>
  );
}
