"use client";

import { formatCurrency } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Same visual language as components/charts/RevenueChart.tsx (grid, axis,
// tooltip card, mv-green) — separate file only because that component's
// Y axis hard-divides by 1000 ("12k"), which would render a young MRR of a
// few hundred dollars as "0.3k", and it has no integer-count variant.

function shortMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { month: "short" }).replace(".", "");
}

function CountTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-mv-border bg-mv-surface px-3 py-2 shadow-mv-md">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
        {label && new Date(label).toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}
      </p>
      <p className="mt-0.5 font-display text-[15px] font-medium text-mv-ink">
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-mv-border bg-mv-surface px-3 py-2 shadow-mv-md">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
        {label && new Date(label).toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}
      </p>
      <p className="mt-0.5 font-display text-[15px] font-medium text-mv-ink">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function RestaurantsJoinedChart({ data, height = 220 }: { data: { date: string; count: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--mv-border)" strokeDasharray="3 4" />
        <XAxis
          dataKey="date"
          tickFormatter={shortMonth}
          tick={{ fill: "var(--mv-ink-faint)", fontSize: 11 }}
          axisLine={{ stroke: "var(--mv-border)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--mv-ink-faint)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CountTooltip unit="restaurants" />} cursor={{ fill: "var(--mv-green)", fillOpacity: 0.06 }} />
        <Bar dataKey="count" fill="var(--mv-green)" radius={[5, 5, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MrrChart({ data, height = 220 }: { data: { date: string; revenue: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="mvMrrFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mv-green)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--mv-green)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--mv-border)" strokeDasharray="3 4" />
        <XAxis
          dataKey="date"
          tickFormatter={shortMonth}
          tick={{ fill: "var(--mv-ink-faint)", fontSize: 11 }}
          axisLine={{ stroke: "var(--mv-border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `$${v}`}
          tick={{ fill: "var(--mv-ink-faint)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<MoneyTooltip />} cursor={{ stroke: "var(--mv-green)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--mv-green)"
          strokeWidth={2.25}
          fill="url(#mvMrrFill)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--mv-green)", stroke: "var(--mv-surface)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
