"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-mv-border bg-mv-surface px-3 py-2 shadow-mv-md">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
        {label && formatDate(label)}
      </p>
      <p className="mt-0.5 font-display text-[15px] font-medium text-mv-ink">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export function RevenueChart({
  data,
  height = 220,
}: {
  data: { date: string; revenue: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="mvRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#167F5B" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#167F5B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#E6E0D0" strokeDasharray="3 4" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => formatDate(v)}
          tick={{ fill: "#8D9488", fontSize: 11 }}
          axisLine={{ stroke: "#E6E0D0" }}
          tickLine={false}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={(v) => `${v / 1000}k`}
          tick={{ fill: "#8D9488", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#167F5B", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#167F5B"
          strokeWidth={2.25}
          fill="url(#mvRevenueFill)"
          dot={false}
          activeDot={{ r: 4, fill: "#167F5B", stroke: "#FBF9F3", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
