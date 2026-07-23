"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { formatCurrency } from "@/lib/utils";
import type { Restaurant, ServiceDay } from "@/lib/types";
import { ArrowLeft, MapPin, TrendingUp, Users, GitCommit } from "lucide-react";
import Link from "next/link";
import { RestaurantWebsiteFaviconCard } from "@/components/minerva/RestaurantWebsiteFaviconCard";

export function EtablissementDetailView({
  restaurant,
  stats,
  recentDays,
  activeEmployeeCount,
  activeProgramCount,
}: {
  restaurant: Restaurant;
  stats: { revenue: number; delta: number };
  recentDays: ServiceDay[];
  activeEmployeeCount: number;
  activeProgramCount: number;
}) {
  const chartData = [...recentDays].reverse().map((d) => ({ date: d.date, revenue: d.revenue }));

  return (
    <div>
      <Link
        href="/maps"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-mv-ink-soft hover:text-mv-ink"
      >
        <ArrowLeft size={14} /> Retour à la carte
      </Link>
      <PageHeader
        eyebrow="Établissement"
        title={restaurant.name.replace("Minerva — ", "")}
        description={[restaurant.address, restaurant.city].filter(Boolean).join(", ") || undefined}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Revenu (mois)</p>
          <p className="mt-1 font-display text-[20px] font-medium text-mv-ink">{formatCurrency(stats.revenue)}</p>
          <Badge tone={stats.delta >= 0 ? "green" : "red"} className="mt-1.5">
            {stats.delta >= 0 ? "↑" : "↓"} {Math.abs(stats.delta).toFixed(1)}%
          </Badge>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Employés actifs</p>
          <p className="mt-1 flex items-center gap-1.5 font-display text-[20px] font-medium text-mv-ink">
            <Users size={16} className="text-mv-ink-faint" /> {activeEmployeeCount}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Programmes actifs</p>
          <p className="mt-1 flex items-center gap-1.5 font-display text-[20px] font-medium text-mv-ink">
            <GitCommit size={16} className="text-mv-ink-faint" /> {activeProgramCount}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Fuseau horaire</p>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-mv-ink">
            <MapPin size={14} className="text-mv-ink-faint" /> {restaurant.timezone}
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          eyebrow="30 derniers jours"
          title="Tendance de revenu"
          description="Le revenu quotidien saisi pour cet établissement."
        />
        {chartData.length > 0 ? (
          <RevenueChart data={chartData} height={220} />
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-mv-cream-soft px-3 py-6 text-center text-[12.5px] text-mv-ink-faint">
            <TrendingUp size={14} /> Aucune journée enregistrée pour l&apos;instant.
          </p>
        )}
      </Card>

      <div className="mt-6">
        <RestaurantWebsiteFaviconCard
          initialWebsiteUrl={`https://${restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.ca`}
          restaurantName={restaurant.name}
        />
      </div>
    </div>
  );
}
