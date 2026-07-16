"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Map, MapMarker, MapRoute, MarkerContent } from "@/components/ui/map";
import { Store, Building2, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type OsrmRouteData = { coordinates: [number, number][]; duration: number; distance: number };

function buildRouteUrl(from: { lng: number; lat: number }, to: { lng: number; lat: number }) {
  return `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
}

function formatDistance(meters?: number) {
  if (!meters) return "—";
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * Real route (OSRM's free public routing server, no key) from a supplier's
 * geocoded address to the current establishment — draws the trajectory and
 * shows an ETA, so "temps nécessaire pour une commande" has a real answer
 * instead of a guess. Origin/destination are static (no live GPS feed
 * exists for a supplier's truck), so this estimates door-to-door drive
 * time rather than tracking a courier in motion.
 */
export function DeliveryTrackerCard({
  supplierName,
  origin,
  destination,
}: {
  supplierName: string;
  origin: { lng: number; lat: number };
  destination: { lng: number; lat: number };
}) {
  const [route, setRoute] = useState<OsrmRouteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(buildRouteUrl(origin, destination))
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const r = data?.routes?.[0];
        if (r?.geometry?.coordinates) {
          setRoute({ coordinates: r.geometry.coordinates, duration: r.duration, distance: r.distance });
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin.lng, origin.lat, destination.lng, destination.lat]);

  const center = useMemo(
    (): [number, number] => [(origin.lng + destination.lng) / 2, (origin.lat + destination.lat) / 2],
    [origin, destination]
  );

  return (
    <Card>
      <CardHeader
        eyebrow="Suivi de livraison"
        title={`${supplierName} → votre établissement`}
        description="Trajet estimé entre le fournisseur et votre établissement."
      />
      <div className="mb-3 flex items-center gap-2 rounded-lg bg-mv-cream-soft px-3 py-2.5">
        <Clock3 size={15} className="text-mv-green-dark" />
        <p className="text-[13px] font-medium text-mv-ink">
          {loading ? "Calcul du trajet…" : formatDuration(route?.duration)}
        </p>
        {!loading && route && <p className="text-[12px] text-mv-ink-faint">· {formatDistance(route.distance)}</p>}
      </div>
      <div className="h-64 overflow-hidden rounded-xl">
        <Map center={center} zoom={11} theme="light" loading={loading}>
          {route && (
            <MapRoute
              id="supplier-route"
              coordinates={route.coordinates}
              color="var(--mv-green)"
              width={4}
              opacity={0.85}
              interactive={false}
            />
          )}
          <MapMarker longitude={origin.lng} latitude={origin.lat}>
            <MarkerContent>
              <div className="grid size-7 place-items-center rounded-full bg-mv-green shadow-md">
                <Store size={14} className="text-mv-cream-soft" />
              </div>
            </MarkerContent>
          </MapMarker>
          <MapMarker longitude={destination.lng} latitude={destination.lat}>
            <MarkerContent>
              <div className="grid size-7 place-items-center rounded-full bg-mv-red shadow-md">
                <Building2 size={14} className="text-white" />
              </div>
            </MarkerContent>
          </MapMarker>
        </Map>
      </div>
    </Card>
  );
}
