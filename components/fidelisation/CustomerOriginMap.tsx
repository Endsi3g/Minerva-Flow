"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, MapControls, MapMarker, MarkerContent, MarkerLabel, MarkerPopup } from "@/components/ui/map";
import { formatCurrency } from "@/lib/utils";
import { getCachedCityCoordinatesAction, geocodeCityIfMissingAction } from "@/app/[locale]/(app)/fidelisation/actions";
import type { CityCoordinates } from "@/lib/data/city-geocodes";
import type { CityOrigin } from "@/lib/customer-origin";

const MONTREAL: [number, number] = [-73.5673, 45.5017];

/**
 * Geocodes and plots the cities a restaurant's customers come from. Cache
 * hits (already-geocoded cities, shared across every restaurant) resolve
 * instantly; anything uncached is backfilled one city at a time from the
 * client, same lazy pattern as the /maps establishments picker — Nominatim's
 * usage policy caps free lookups around 1/s, so this can't be a single
 * batch call.
 */
export function CustomerOriginMap({ cities, maxGeocode = 12 }: { cities: CityOrigin[]; maxGeocode?: number }) {
  const [coords, setCoords] = useState<Record<string, CityCoordinates>>({});
  const backfilledRef = useRef(false);

  const candidateCities = useMemo(
    () => cities.slice(0, maxGeocode).map((c) => c.city),
    [cities, maxGeocode]
  );

  useEffect(() => {
    if (candidateCities.length === 0) return;
    getCachedCityCoordinatesAction(candidateCities).then((cached) => {
      setCoords((prev) => ({ ...prev, ...cached }));
    });
  }, [candidateCities]);

  useEffect(() => {
    if (backfilledRef.current || candidateCities.length === 0) return;
    backfilledRef.current = true;

    let cancelled = false;
    async function backfill() {
      for (const city of candidateCities) {
        if (cancelled) return;
        const key = city.trim().toLowerCase();
        if (coords[key]) continue;
        const resolved = await geocodeCityIfMissingAction(city);
        if (cancelled) return;
        if (resolved) setCoords((prev) => ({ ...prev, [key]: resolved }));
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    backfill();
    return () => {
      cancelled = true;
    };
    // Runs once per mount against the initial candidate list — coords is read
    // fresh via functional updates, not depended on here (that would re-trigger
    // the backfill loop on every partial resolution).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateCities]);

  const plotted = cities
    .map((c) => ({ ...c, coords: coords[c.city.trim().toLowerCase()] }))
    .filter((c): c is CityOrigin & { coords: CityCoordinates } => Boolean(c.coords));

  const maxVisits = Math.max(1, ...plotted.map((c) => c.visits));
  const center: [number, number] =
    plotted.length > 0
      ? [
          plotted.reduce((sum, c) => sum + c.coords.lng, 0) / plotted.length,
          plotted.reduce((sum, c) => sum + c.coords.lat, 0) / plotted.length,
        ]
      : MONTREAL;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <Map center={center} zoom={plotted.length > 1 ? 6 : 10} theme="light" className="h-full w-full">
        <MapControls position="bottom-right" showZoom />
        {plotted.map((c) => {
          const scale = 0.55 + (c.visits / maxVisits) * 0.65;
          return (
            <MapMarker key={c.city} longitude={c.coords.lng} latitude={c.coords.lat}>
              <MarkerContent>
                <span
                  className="flex items-center justify-center rounded-full border-2 border-white bg-mv-green text-[10px] font-bold text-white shadow-lg"
                  style={{ width: `${scale * 32}px`, height: `${scale * 32}px` }}
                >
                  {c.customerCount}
                </span>
                <MarkerLabel position="bottom">{c.city}</MarkerLabel>
              </MarkerContent>
              <MarkerPopup className="w-56 p-3.5">
                <p className="font-display text-[14px] font-medium text-mv-ink">{c.city}</p>
                <div className="mt-2 space-y-1 text-[12px] text-mv-ink-soft">
                  <div className="flex items-center justify-between">
                    <span>Clients</span>
                    <span className="font-semibold text-mv-ink">{c.customerCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Visites cumulées</span>
                    <span className="font-semibold text-mv-ink">{c.visits}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dépenses cumulées</span>
                    <span className="font-semibold text-mv-ink">{formatCurrency(c.spent)}</span>
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          );
        })}
      </Map>
    </div>
  );
}
