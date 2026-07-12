"use client";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart } from "recharts";

export function MiniSparkline({
  data,
  dataKey = "value",
  color = "var(--mv-green)",
  id,
}: {
  data: Record<string, number | string>[];
  dataKey?: string;
  color?: string;
  id: string;
}) {
  const config = {
    [dataKey]: { label: dataKey, color },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto h-12 w-full">
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`mvSpark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="natural"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#mvSpark-${id})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
