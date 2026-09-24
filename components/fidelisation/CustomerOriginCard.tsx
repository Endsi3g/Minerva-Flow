"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { CustomerOriginMap } from "@/components/fidelisation/CustomerOriginMap";
import type { CityOrigin } from "@/lib/customer-origin";
import { MapPin, Share2 } from "lucide-react";

export type AcquisitionSourceCount = { channel: string; count: number };

const SOURCE_LABELS: Record<string, string> = {
  meta: "Meta / Facebook",
  instagram: "Instagram",
  google: "Google",
  organic: "Naturel / direct",
  qr: "QR de parrainage",
  share: "Partage social",
  copy: "Lien copié",
  code: "Code de parrainage",
  direct: "Parrainage direct",
};

export function CustomerOriginCard({
  cities,
  profileCount,
  sources = [],
}: {
  cities: CityOrigin[];
  profileCount: number;
  sources?: AcquisitionSourceCount[];
}) {
  const maxVisits = Math.max(1, ...cities.map((city) => city.visits));
  const sortedSources = [...sources].sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader
        eyebrow="Géographie et acquisition"
        title="D’où viennent vos clients ?"
        description={
          profileCount > 0
            ? `${profileCount} profil${profileCount > 1 ? "s indiquent" : " indique"} une ville ou un quartier. Les localités sont déclarées par les clients et placées de façon approximative; aucune position GPS n’est collectée.`
            : "La carte se remplit à partir des villes et quartiers indiqués par les clients. Les sources reposent sur les conversions publicitaires et les parrainages attribués."
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(220px,0.8fr)]">
        {cities.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="h-72 overflow-hidden rounded-xl">
              <CustomerOriginMap cities={cities} maxGeocode={30} />
            </div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {cities.map((city) => (
                <div key={city.label} className="relative overflow-hidden rounded-lg bg-mv-cream-soft p-2.5">
                  <div
                    className="absolute inset-y-0 left-0 bg-mv-green/10"
                    style={{ width: `${Math.max(6, (city.visits / maxVisits) * 100)}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[12.5px] font-medium text-mv-ink">
                      <MapPin size={12} className="shrink-0 text-mv-green-dark" /> {city.label}
                    </span>
                    <span className="shrink-0 text-[11.5px] font-semibold text-mv-ink-soft">
                      {city.customerCount} client{city.customerCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-mv-border bg-mv-cream-soft/50 p-6 text-center">
            <MapPin size={20} className="text-mv-ink-faint" />
            <p className="max-w-sm text-[12.5px] text-mv-ink-soft">
              Aucune ville n’est encore indiquée dans les profils clients. La carte affiche des villes, jamais une position précise.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 p-3.5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
            <Share2 size={13} /> Sources attribuées
          </div>
          {sortedSources.length > 0 ? (
            <div className="space-y-2">
              {sortedSources.map((source) => (
                <div key={source.channel} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="truncate text-mv-ink-soft">{SOURCE_LABELS[source.channel] ?? source.channel}</span>
                  <span className="font-semibold tabular-nums text-mv-ink">{source.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-mv-ink-soft">
              Pas encore de conversion attribuée. Les visites sans source mesurée ne sont pas estimées ni classées.
            </p>
          )}
          <p className="mt-3 border-t border-mv-border-soft pt-2.5 text-[10.5px] leading-relaxed text-mv-ink-faint">
            Villes et quartiers déclarés par les clients; emplacement cartographique approximatif. Canaux issus des connexions marketing et du suivi de parrainage.
          </p>
        </div>
      </div>
    </Card>
  );
}
