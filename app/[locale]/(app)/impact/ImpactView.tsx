"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatGrid } from "@/components/ui/StatGrid";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import type { LtvImpact } from "@/lib/engine/impact";
import { DollarSign, TrendingUp, Repeat, Users } from "lucide-react";

export function ImpactView({
  restaurantName,
  impact,
}: {
  restaurantName: string | null;
  impact: LtvImpact | null;
}) {
  if (!impact) {
    return (
      <div>
        <PageHeader eyebrow="Impact LTV" title="Impact de l'écosystème fidélisation" />
        <EmptyState
          icon={TrendingUp}
          title="Aucun établissement sélectionné"
          description="Choisissez un établissement pour voir son impact LTV."
        />
      </div>
    );
  }

  const { visitFrequency } = impact;
  const hasEnoughData = visitFrequency.hasEnoughSignal;

  return (
    <div>
      <PageHeader
        eyebrow="Impact LTV"
        title="Impact de l'écosystème fidélisation"
        description={
          restaurantName
            ? `Ce que le menu engineering et la rétention automatisée rapportent concrètement à ${restaurantName}.`
            : "Ce que le menu engineering et la rétention automatisée rapportent concrètement."
        }
      />

      <AlertBanner tone="info" title="Comment lire ces chiffres" className="mb-6">
        Pas de comparaison « avant / après » ici — un établissement qui vient d&apos;activer la rétention n&apos;a pas
        d&apos;historique à comparer. On compare plutôt les clients touchés par l&apos;écosystème (relances, menu actif
        épuré) à ceux qui ne le sont pas, sur la même période.
      </AlertBanner>

      <StatGrid cols={3}>
        <StatCard
          label="Revenu incrémental"
          value={formatCurrency(impact.incrementalRevenue)}
          icon={DollarSign}
          sublabel="Visites dans les 14 jours suivant une relance"
          accent="green"
        />
        <StatCard
          label="Gain de marge — menu"
          value={`${impact.marginGainPct >= 0 ? "+" : ""}${impact.marginGainPct.toFixed(1)} pts`}
          icon={TrendingUp}
          sublabel={`Marge du menu actif : ${impact.activeMarginPct.toFixed(1)}%`}
          accent={impact.marginGainPct >= 0 ? "green" : "amber"}
        />
        <StatCard
          label="Fréquence de visite"
          value={hasEnoughData ? `×${visitFrequency.multiplier.toFixed(1)}` : "—"}
          icon={Repeat}
          sublabel="Clients touchés vs non touchés par une relance"
          accent="lime"
        />
      </StatGrid>

      <div className="mt-6">
        <Card>
          <CardHeader
            eyebrow="Détail"
            title="Fréquence de visite — touchés vs non touchés"
            description="Visites par mois de présence, en moyenne, par segment."
          />
          {hasEnoughData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-mv-green/20 bg-mv-green-tint p-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-green-dark">
                  <Users size={13} /> Touchés par une relance
                </p>
                <p className="mt-1 font-display text-[24px] font-medium text-mv-green-darker">
                  {visitFrequency.touchedPerMonth.toFixed(2)} <span className="text-[13px] font-normal">visites/mois</span>
                </p>
                <p className="mt-1 text-[12px] text-mv-ink-soft">{visitFrequency.touchedCount} client(s)</p>
              </div>
              <div className="rounded-xl border border-mv-border bg-mv-cream-soft p-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  <Users size={13} /> Jamais touchés
                </p>
                <p className="mt-1 font-display text-[24px] font-medium text-mv-ink">
                  {visitFrequency.untouchedPerMonth.toFixed(2)} <span className="text-[13px] font-normal">visites/mois</span>
                </p>
                <p className="mt-1 text-[12px] text-mv-ink-soft">{visitFrequency.untouchedCount} client(s)</p>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-mv-ink-faint">
              Pas encore assez de données — activez la rétention automatique et laissez quelques relances partir pour
              voir ce comparatif.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
