"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { RadialGauge } from "@/components/charts/RadialGauge";
import { formatCurrency } from "@/lib/utils";
import type { LtvImpactRollup } from "@/lib/engine/impact";
import type { Restaurant } from "@/lib/types";
import { DollarSign, TrendingUp, Repeat, Building2 } from "lucide-react";

export function FranchiseView({
  restaurants,
  rollup,
  monthRevenue,
}: {
  restaurants: Restaurant[];
  rollup: LtvImpactRollup | null;
  monthRevenue: number;
}) {
  if (!rollup) {
    return (
      <div>
        <PageHeader eyebrow="Franchise" title="Vue franchise" />
        <EmptyState
          icon={Building2}
          title="Un seul établissement pour l'instant"
          description="La vue franchise regroupe vos résultats dès que vous gérez au moins deux établissements dans le même workspace. Ajoutez-en un depuis « Toutes les équipes »."
        />
      </div>
    );
  }

  const touchedShare =
    rollup.visitFrequency.multiplier > 0
      ? (rollup.visitFrequency.touchedPerMonth / (rollup.visitFrequency.touchedPerMonth + rollup.visitFrequency.untouchedPerMonth || 1)) * 100
      : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Franchise"
        title="Vue franchise"
        description={`Résultats combinés sur ${rollup.restaurantCount} établissements.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <RadialGauge
            value={monthRevenue ? (rollup.totalIncrementalRevenue / monthRevenue) * 100 : 0}
            color="var(--mv-green)"
            centerValue={`${monthRevenue ? Math.round((rollup.totalIncrementalRevenue / monthRevenue) * 100) : 0}%`}
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
              {formatCurrency(rollup.totalIncrementalRevenue)}
            </p>
            <p className="mt-0.5 text-[12px] text-mv-ink-soft">Tous établissements confondus</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <RadialGauge
            value={rollup.avgActiveMarginPct}
            color="var(--mv-green)"
            centerValue={`${rollup.avgActiveMarginPct.toFixed(0)}%`}
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
              {rollup.avgMarginGainPct >= 0 ? "+" : ""}
              {rollup.avgMarginGainPct.toFixed(1)} pt en moyenne
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <RadialGauge
            value={touchedShare}
            color="var(--mv-lime-dark)"
            centerValue={rollup.visitFrequency.multiplier > 0 ? `×${rollup.visitFrequency.multiplier.toFixed(1)}` : "—"}
            centerLabel="plus souvent"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              <Repeat size={13} /> Reviennent plus souvent
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-mv-ink-faint">
              Clients touchés par une relance, comparés à ceux qui n&apos;en ont pas reçu.
            </p>
            <p className="mt-1 text-[12px] text-mv-ink-soft">Moyenne pondérée sur tous les établissements</p>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader eyebrow="Détail" title="Par établissement" />
          <Table>
            <THead>
              <Tr>
                <Th>Établissement</Th>
                <Th>Ventes grâce à la fidélisation</Th>
                <Th>Marge gagnée</Th>
                <Th>Reviennent (×)</Th>
              </Tr>
            </THead>
            <tbody>
              {rollup.perRestaurant.map((impact) => {
                const restaurant = restaurants.find((r) => r.id === impact.restaurantId);
                return (
                  <Tr key={impact.restaurantId}>
                    <Td className="font-medium text-mv-ink">{restaurant?.name ?? "—"}</Td>
                    <Td>{formatCurrency(impact.incrementalRevenue)}</Td>
                    <Td>
                      {impact.marginGainPct >= 0 ? "+" : ""}
                      {impact.marginGainPct.toFixed(1)} pt
                    </Td>
                    <Td>{impact.visitFrequency.multiplier > 0 ? `×${impact.visitFrequency.multiplier.toFixed(1)}` : "—"}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
