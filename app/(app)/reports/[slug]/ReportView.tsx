"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { FlowBars } from "@/components/charts/FlowBars";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { useApp, useCurrentRestaurant, roleLabels } from "@/lib/app-context";
import type { ReportDef } from "@/lib/reports";
import type { Campaign, FlowLine } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, Star, Filter, Share2, Clock, Store, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const periodLabel: Record<string, string> = {
  jour: "Aujourd'hui",
  semaine: "Cette semaine",
  mois: "Ce mois-ci",
  custom: "Personnalisé",
};

export function ReportView({
  report,
  trend,
  breakdown,
  campaigns,
}: {
  report: ReportDef;
  trend: { date: string; revenue: number }[];
  breakdown: FlowLine[];
  campaigns: Campaign[];
}) {
  const { period, role } = useApp();
  const restaurant = useCurrentRestaurant();
  const [starred, setStarred] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] text-mv-ink-faint">
          <Link href="/overview" className="flex items-center gap-1 hover:text-mv-ink">
            <ChevronLeft size={14} /> Reports
          </Link>
          <span>/</span>
          <button
            onClick={() => setStarred((v) => !v)}
            className="flex items-center gap-1.5 hover:text-mv-ink"
          >
            <Star
              size={13}
              className={starred ? "fill-mv-lime-dark text-mv-lime-dark" : ""}
            />
            {report.label}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <Avatar name="Camille Andrieu" size={26} className="ring-2 ring-mv-cream" />
            <Avatar name={roleLabels[role]} size={26} className="ring-2 ring-mv-cream" />
          </div>
          <Button size="sm" variant="secondary">
            <Filter size={14} /> Filter
          </Button>
          <Button size="sm" variant="secondary">
            <Share2 size={14} /> Share
          </Button>
        </div>
      </div>

      <button
        onClick={() => setStarred((v) => !v)}
        className="mb-3"
        aria-label="Marquer comme favori"
      >
        <Star
          size={26}
          className={starred ? "fill-mv-lime-dark text-mv-lime-dark" : "text-mv-ink-mute"}
        />
      </button>

      <h1 className="mb-5 font-display text-[32px] font-medium tracking-tight text-mv-ink">
        {report.label}
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft">
          <Clock size={13} /> {periodLabel[period]}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft">
          <Store size={13} /> {restaurant.name}
        </span>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-mv-border text-mv-ink-faint hover:text-mv-ink">
          <Plus size={14} />
        </button>
      </div>

      <div className="mb-8">
        <h2 className="mb-2 font-display text-[18px] font-medium text-mv-ink">
          Résumé
        </h2>
        <p className="max-w-3xl text-[14px] leading-relaxed text-mv-ink-soft">
          {report.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="relative rounded-2xl border-2 border-mv-green bg-mv-surface p-5 shadow-mv-md">
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              {report.label}
            </p>
            <p className="mt-1 text-[11.5px] text-mv-ink-faint">{periodLabel[period]}</p>
            <p className="mt-4 font-display text-[42px] font-medium leading-none text-mv-ink">
              {report.unit === "currency" ? formatCurrency(report.value) : report.value}
            </p>
            {report.delta !== undefined && (
              <Badge tone={report.delta >= 0 ? "green" : "red"} className="mt-3">
                {report.delta >= 0 ? "↑" : "↓"} {Math.abs(report.delta).toFixed(1)}% vs période précédente
              </Badge>
            )}
            {trend.length > 0 && (
              <div className="mt-4">
                <RevenueChart data={trend} height={140} />
              </div>
            )}
            <div className="absolute -bottom-3 -left-3">
              <Avatar
                name={roleLabels[role]}
                size={30}
                className="ring-2 ring-mv-cream shadow-mv-sm"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          {breakdown.length > 0 ? (
            <Card className="h-full">
              <CardHeader title="Répartition" description="Sur la période sélectionnée" />
              <FlowBars lines={breakdown} tone={report.slug === "sorties" ? "ink" : "green"} />
            </Card>
          ) : campaigns.length > 0 ? (
            <Card className="h-full">
              <CardHeader title="Campagnes" description={`${campaigns.length} au total`} />
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2.5"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-mv-ink">{c.name}</p>
                      <p className="text-[11.5px] text-mv-ink-faint">{c.channel}</p>
                    </div>
                    <Badge tone="neutral">{formatCurrency(c.estimatedRevenue)}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="h-full">
              <CardHeader title="Détail" description="Journées marquantes de la période" />
              <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
                Le pic du 10 juillet correspond à la Soirée Jazz ; le creux du 8 juillet est lié à
                la météo. Voir la page{" "}
                <Link href="/days" className="text-mv-green-dark underline underline-offset-2">
                  Days
                </Link>{" "}
                pour le détail jour par jour.
              </p>
            </Card>
          )}
        </div>
      </div>

      {report.kind === "trend" && trend.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader
              eyebrow="Détail"
              title={`${report.label} — jour par jour`}
              description="Chaque point correspond à une journée de service"
            />
            <Table>
              <THead>
                <Th>Date</Th>
                <Th className="text-right">Valeur</Th>
              </THead>
              <tbody>
                {[...trend]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 8)
                  .map((d) => (
                    <Tr key={d.date}>
                      <Td>{formatDate(d.date)}</Td>
                      <Td className="text-right font-semibold">{formatCurrency(d.revenue)}</Td>
                    </Tr>
                  ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
