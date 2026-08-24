"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export type DonutDatum = { label: string; value: number; color: string };

/**
 * Small donut + legend with a total figure in the center — used wherever
 * Overview shows a category breakdown (menu quadrants, loyalty tiers)
 * instead of a bare row of numbers.
 */
export function DistributionDonut({ data, size = 116 }: { data: DonutDatum[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const nonZero = data.filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={nonZero}
                dataKey="value"
                nameKey="label"
                innerRadius="62%"
                outerRadius="94%"
                paddingAngle={nonZero.length > 1 ? 3 : 0}
                stroke="none"
              >
                {nonZero.map((d) => (
                  <Cell key={d.label} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-full border-8 border-mv-border-soft" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[19px] font-medium leading-none text-mv-ink">{total}</span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-mv-ink-faint">Total</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-mv-ink-soft">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-mv-ink">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
