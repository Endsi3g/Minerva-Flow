"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatGrid } from "@/components/ui/StatGrid";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import type { LtvImpactRollup } from "@/lib/engine/impact";
import type { Restaurant } from "@/lib/types";
import { DollarSign, TrendingUp, Repeat, Building2 } from "lucide-react";

export function FranchiseView({
  restaurants,
  rollup,
}: {
  restaurants: Restaurant[];
  rollup: LtvImpactRollup | null;
}) {
  if (!rollup) {
    return (
      <div>
        <PageHeader eyebrow="Franchise" title="Vue franchise" />
        <EmptyState
          icon={Building2}
          title="Un seul établissement pour l'instant"
          description="La vue franchise agrège l'impact LTV dès que vous gérez au moins deux établissements dans le même workspace. Ajoutez-en un depuis « Toutes les équipes »."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Franchise"
        title="Vue franchise"
        description={`Impact LTV consolidé sur ${rollup.restaurantCount} établissements.`}
      />

      <StatGrid cols={3}>
        <StatCard
          label="Revenu incrémental — total"
          value={formatCurrency(rollup.totalIncrementalRevenue)}
          icon={DollarSign}
          sublabel="Tous établissements confondus"
          accent="green"
        />
        <StatCard
          label="Gain de marge moyen"
          value={`${rollup.avgMarginGainPct >= 0 ? "+" : ""}${rollup.avgMarginGainPct.toFixed(1)} pts`}
          icon={TrendingUp}
          sublabel={`Marge active moyenne : ${rollup.avgActiveMarginPct.toFixed(1)}%`}
          accent={rollup.avgMarginGainPct >= 0 ? "green" : "amber"}
        />
        <StatCard
          label="Fréquence de visite"
          value={rollup.visitFrequency.multiplier > 0 ? `×${rollup.visitFrequency.multiplier.toFixed(1)}` : "—"}
          icon={Repeat}
          sublabel="Touchés vs non touchés, pondéré"
          accent="lime"
        />
      </StatGrid>

      <div className="mt-6">
        <Card>
          <CardHeader eyebrow="Détail" title="Par établissement" />
          <Table>
            <THead>
              <Tr>
                <Th>Établissement</Th>
                <Th>Revenu incrémental</Th>
                <Th>Gain de marge</Th>
                <Th>Fréquence (×)</Th>
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
                      {impact.marginGainPct.toFixed(1)} pts
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
