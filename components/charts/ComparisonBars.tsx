"use client";

import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList } from "recharts";

export type ComparisonBarDatum = { label: string; value: number; color: string };

/**
 * Compact horizontal 2-3 bar comparison — used wherever Overview shows "X
 * vs Y" (touched vs untouched, active menu margin vs full menu, revenu
 * total vs incrémental) instead of a bare pair of numbers.
 */
export function ComparisonBars({
  data,
  height = 100,
  formatValue,
}: {
  data: ComparisonBarDatum[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 84, bottom: 4, left: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={128}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11.5, fill: "var(--mv-ink-soft)" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: unknown) => {
              const n = typeof v === "number" ? v : Number(v);
              return formatValue ? formatValue(n) : String(n);
            }}
            style={{ fontSize: 12, fontWeight: 600, fill: "var(--mv-ink)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
