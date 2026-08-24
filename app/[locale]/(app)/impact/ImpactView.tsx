"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { formatCurrency } from "@/lib/utils";
import type { LtvImpact } from "@/lib/engine/impact";
import { DollarSign, TrendingUp, Repeat, Users } from "lucide-react";

export function ImpactView({
  restaurantName,
  impact,
  monthRevenue,
}: {
  restaurantName: string | null;
  impact: LtvImpact | null;
  monthRevenue: number;
}) {
  if (!impact) {
    return (
      <div>
        <PageHeader eyebrow="Impact" title="Ce que la fidélisation vous rapporte" />
        <EmptyState
          icon={TrendingUp}
          title="Aucun établissement sélectionné"
          description="Choisissez un établissement pour voir ce que la fidélisation lui rapporte."
        />
      </div>
    );
  }

  const { visitFrequency } = impact;
  const hasEnoughData = visitFrequency.hasEnoughSignal;
  const touchedShare = hasEnoughData
    ? (visitFrequency.touchedPerMonth / (visitFrequency.touchedPerMonth + visitFrequency.untouchedPerMonth || 1)) * 100
    : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Impact"
        title="Ce que la fidélisation vous rapporte"
        description={
          restaurantName
            ? `L'effet concret d'un menu optimisé et de relances automatiques chez ${restaurantName}.`
            : "L'effet concret d'un menu optimisé et de relances automatiques."
        }
      />

      <AlertBanner tone="info" title="Comment lire ces chiffres" className="mb-6">
        On ne compare pas un « avant / après » — un établissement qui vient tout juste d&apos;activer la fidélisation
        n&apos;a pas d&apos;historique à comparer. On compare plutôt, sur la même période, les clients qui ont reçu une
        relance à ceux qui n&apos;en ont pas reçu.
      </AlertBanner>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <RadialGauge
            value={monthRevenue ? (impact.incrementalRevenue / monthRevenue) * 100 : 0}
            color="var(--mv-green)"
            centerValue={`${monthRevenue ? Math.round((impact.incrementalRevenue / monthRevenue) * 100) : 0}%`}
            centerLabel="du mois"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <DollarSign size={13} /> Ventes grâce à la fidélisation
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
              Achats en plus générés par vos relances automatiques, ce mois-ci.
            </p>
            <p className="mt-1 font-display text-[17px] font-medium text-mv-ink">
              {formatCurrency(impact.incrementalRevenue)}
            </p>
            <p className="mt-0.5 text-[12px] text-mv-ink-soft">Visites dans les 14 jours suivant une relance</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <RadialGauge
            value={impact.activeMarginPct}
            color="var(--mv-green)"
            centerValue={`${impact.activeMarginPct.toFixed(0)}%`}
            centerLabel="marge"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <TrendingUp size={13} /> Marge gagnée sur le menu
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
              Marge des plats que vous mettez de l&apos;avant, comparée à l&apos;ensemble du menu.
            </p>
            <p className="mt-1 text-[12px] text-mv-ink-soft">
              {impact.marginGainPct >= 0 ? "+" : ""}
              {impact.marginGainPct.toFixed(1)} pt vs le menu au complet
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <RadialGauge
            value={touchedShare}
            color="var(--mv-lime-dark)"
            centerValue={hasEnoughData ? `×${visitFrequency.multiplier.toFixed(1)}` : "—"}
            centerLabel="plus souvent"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <Repeat size={13} /> Reviennent plus souvent
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
              Clients touchés par une relance, comparés à ceux qui n&apos;en ont pas reçu.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            eyebrow="Détail"
            title="À quelle fréquence vos clients reviennent"
            description="Nombre moyen de visites par mois, selon qu'ils ont reçu une relance ou non."
          />
          {hasEnoughData ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-mv-green/20 bg-mv-green-tint p-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-green-dark">
                  <Users size={13} /> Ont reçu une relance
                </p>
                <p className="mt-1 font-display text-[24px] font-medium text-mv-green-darker">
                  {visitFrequency.touchedPerMonth.toFixed(2)} <span className="text-[13px] font-normal">visites/mois</span>
                </p>
                <p className="mt-1 text-[12px] text-mv-ink-soft">{visitFrequency.touchedCount} client(s)</p>
              </div>
              <div className="rounded-xl border border-mv-border bg-mv-cream-soft p-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
                  <Users size={13} /> N&apos;en ont jamais reçu
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
