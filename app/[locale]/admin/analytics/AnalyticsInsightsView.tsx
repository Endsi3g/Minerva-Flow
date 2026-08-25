"use client";

import { Fragment } from "react";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { MiniSparkline } from "@/components/charts/MiniSparkline";
import { StatCard } from "@/components/ui/StatCard";
import { formatDate } from "@/lib/utils";
import { Users, Eye, MonitorSmartphone } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  TrafficOverview,
  BreakdownRow,
  HeatmapCell,
  RetentionCohort,
} from "@/lib/data/posthog-insights";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function Unavailable({ label }: { label: string }) {
  return (
    <p className="py-6 text-center text-[12.5px] text-mv-ink-faint">
      {label} indisponible pour l&apos;instant.
    </p>
  );
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-mv-border bg-mv-surface px-3 py-2 shadow-mv-md">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
        {label && formatDate(label)}
      </p>
      <p className="mt-0.5 font-display text-[15px] font-medium text-mv-ink">{payload[0].value}</p>
    </div>
  );
}

function TrafficTrendChart({ data }: { data: { date: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="mvTrafficFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mv-green)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--mv-green)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--mv-border)" strokeDasharray="3 4" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDate(v)}
          tick={{ fill: "var(--mv-ink-faint)", fontSize: 11 }}
          axisLine={{ stroke: "var(--mv-border)" }}
          tickLine={false}
          minTickGap={28}
        />
        <YAxis tick={{ fill: "var(--mv-ink-faint)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--mv-green)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--mv-green)"
          strokeWidth={2.25}
          fill="url(#mvTrafficFill)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--mv-green)", stroke: "var(--mv-surface)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-[12.5px] text-mv-ink-soft">{r.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mv-cream-soft">
            <div
              className="h-full rounded-full bg-mv-green"
              style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-[12px] text-mv-ink-faint">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

function RetentionTable({ cohorts }: { cohorts: RetentionCohort[] }) {
  const maxCols = Math.max(...cohorts.map((c) => c.values.length));
  function cellTone(pct: number) {
    if (pct >= 60) return "bg-mv-green text-white";
    if (pct >= 35) return "bg-mv-green-tint text-mv-green-dark";
    if (pct >= 15) return "bg-mv-cream-soft text-mv-ink-soft";
    return "bg-mv-cream-soft/40 text-mv-ink-faint";
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohortLabel}>
              <td className="whitespace-nowrap pr-3 py-1 text-mv-ink-faint">{c.cohortLabel}</td>
              {Array.from({ length: maxCols }).map((_, i) => {
                const pct = c.values[i];
                return (
                  <td key={i} className="p-0.5">
                    {pct !== undefined && (
                      <div className={`flex h-8 w-14 items-center justify-center rounded-md font-mono text-[11px] ${cellTone(pct)}`}>
                        {pct}%
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HourlyHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const byKey = new Map(cells.map((c) => [`${c.day}-${c.hour}`, c.count]));
  const max = Math.max(...cells.map((c) => c.count), 1);
  function opacity(count: number) {
    if (count === 0) return 0.04;
    return 0.15 + (count / max) * 0.85;
  }
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-cols-[32px_repeat(24,minmax(14px,1fr))] gap-[3px]">
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} className="text-center text-[9px] text-mv-ink-faint">
            {h % 3 === 0 ? h : ""}
          </div>
        ))}
        {DAY_LABELS.map((label, day) => (
          <Fragment key={day}>
            <div className="flex items-center text-[10.5px] text-mv-ink-faint">{label}</div>
            {Array.from({ length: 24 }).map((_, hour) => {
              const count = byKey.get(`${day}-${hour}`) ?? 0;
              return (
                <div
                  key={`${day}-${hour}`}
                  title={`${label} ${hour}h — ${count} vue${count > 1 ? "s" : ""}`}
                  className="aspect-square rounded-[3px]"
                  style={{ backgroundColor: `rgba(22, 127, 91, ${opacity(count)})` }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsInsightsView({
  overview,
  countries,
  browsers,
  channels,
  retention,
  heatmap,
}: {
  overview: TrafficOverview | null;
  countries: BreakdownRow[] | null;
  browsers: BreakdownRow[] | null;
  channels: BreakdownRow[] | null;
  retention: RetentionCohort[] | null;
  heatmap: HeatmapCell[] | null;
}) {
  return (
    <div className="space-y-4">
      {overview && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Visiteurs uniques"
              value={overview.uniqueVisitors}
              delta={overview.uniqueVisitorsDelta}
              icon={Users}
              sublabel="14 derniers jours"
              footer={<MiniSparkline id="visitors" data={overview.visitorsSeries} />}
            />
            <StatCard
              label="Pages vues"
              value={overview.pageviews}
              delta={overview.pageviewsDelta}
              icon={Eye}
              sublabel="14 derniers jours"
              footer={<MiniSparkline id="pageviews" data={overview.pageviewsSeries} />}
            />
            <StatCard
              label="Sessions"
              value={overview.sessions}
              delta={overview.sessionsDelta}
              icon={MonitorSmartphone}
              sublabel="14 derniers jours"
              footer={<MiniSparkline id="sessions" data={overview.sessionsSeries} />}
            />
          </div>

          <Card>
            <CardHeader title="Évolution du trafic" description="Visiteurs uniques par jour, 14 derniers jours." />
            <TrafficTrendChart data={overview.visitorsSeries} />
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Pays" />
          {countries && countries.length > 0 ? <BreakdownList rows={countries} /> : <Unavailable label="Répartition par pays" />}
        </Card>
        <Card>
          <CardHeader title="Navigateur" />
          {browsers && browsers.length > 0 ? <BreakdownList rows={browsers} /> : <Unavailable label="Répartition par navigateur" />}
        </Card>
        <Card>
          <CardHeader title="Canaux" />
          {channels && channels.length > 0 ? <BreakdownList rows={channels} /> : <Unavailable label="Répartition par canal" />}
        </Card>
      </div>

      <Card>
        <CardHeader title="Rétention hebdomadaire" description="Part des visiteurs revenus chaque semaine suivante." />
        {retention && retention.length > 0 ? <RetentionTable cohorts={retention} /> : <Unavailable label="Rétention" />}
      </Card>

      <Card>
        <CardHeader title="Meilleurs horaires" description="Pages vues par jour et par heure, 28 derniers jours." />
        {heatmap && heatmap.length > 0 ? <HourlyHeatmap cells={heatmap} /> : <Unavailable label="Heatmap horaires" />}
      </Card>
    </div>
  );
}
