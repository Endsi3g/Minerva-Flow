"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendSeries = {
  key: string;
  slug: string;
  label: string;
  color: string;
  data: { date: string; revenue: number }[];
};

function mergeSeries(series: TrendSeries[]) {
  const map = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (const d of s.data) {
      const row = map.get(d.date) ?? { date: d.date };
      row[s.key] = d.revenue;
      map.set(d.date, row);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
  series: TrendSeries[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-mv-border bg-mv-surface px-3 py-2 shadow-mv-md">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
        {label && formatDate(label)}
      </p>
      {payload.map((p) => {
        const s = series.find((x) => x.key === p.dataKey);
        if (!s) return null;
        return (
          <div key={p.dataKey} className="flex items-center gap-2 text-[13px]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="text-mv-ink-soft">{s.label}</span>
            <span className="ml-auto font-semibold text-mv-ink">
              {formatCurrency(p.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function UnifiedTrendChart({ series }: { series: TrendSeries[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const data = mergeSeries(series);

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--mv-border)" strokeDasharray="3 4" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatDate(v)}
            tick={{ fill: "var(--mv-ink-faint)", fontSize: 11 }}
            axisLine={{ stroke: "var(--mv-border)" }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v) => `${v / 1000}k`}
            tick={{ fill: "var(--mv-ink-faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<ChartTooltip series={series} />} />
          {series.map((s) => {
            const isDimmed = hovered && hovered !== s.key;
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={hovered === s.key ? 3 : 2.25}
                strokeOpacity={isDimmed ? 0.18 : 1}
                dot={false}
                activeDot={{ r: 4, fill: s.color, stroke: "var(--mv-surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-mv-border-soft pt-4">
        {series.map((s) => (
          <Link
            key={s.key}
            href={`/reports/${s.slug}`}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
            className="group flex items-center gap-2 rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft transition-all hover:border-transparent hover:shadow-mv-sm"
            style={hovered === s.key ? { background: "var(--mv-cream-soft)" } : undefined}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="text-mv-ink-faint transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
