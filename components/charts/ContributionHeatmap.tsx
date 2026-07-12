"use client";

import { bucketFor, heatmapBuckets } from "./heatmap-scale";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";

export function ContributionHeatmap({
  data,
}: {
  data: { date: string; revenue: number; dow: number }[];
}) {
  const [hover, setHover] = useState<{ date: string; revenue: number } | null>(null);
  const revenues = data.map((d) => d.revenue);
  const min = Math.min(...revenues);
  const max = Math.max(...revenues);

  const firstDow = data[0] ? (data[0].dow === 0 ? 6 : data[0].dow - 1) : 0;
  const cells: (typeof data[number] | null)[] = [
    ...new Array(firstDow).fill(null),
    ...data,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex h-full flex-col">
      <div className="grid flex-1 grid-cols-7 gap-1.5">
        {cells.map((d, i) =>
          d ? (
            <div
              key={i}
              onMouseEnter={() => setHover(d)}
              onMouseLeave={() => setHover(null)}
              className="min-h-[15px] w-full rounded-[4px] opacity-90 transition-all hover:opacity-100 hover:ring-2 hover:ring-mv-green/40"
              style={{ background: bucketFor(d.revenue, min, max) }}
            />
          ) : (
            <div key={i} />
          )
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-mv-border-soft pt-3">
        <div className="h-4 text-[12px] text-mv-ink-soft">
          {hover ? (
            <>
              <span className="font-semibold text-mv-ink">{formatDate(hover.date)}</span>{" "}
              — {formatCurrency(hover.revenue)}
            </>
          ) : (
            "Survolez un jour"
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-mv-ink-faint">Faible</span>
          {heatmapBuckets.map((c) => (
            <div key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
          ))}
          <span className="text-[11px] text-mv-ink-faint">Fort</span>
        </div>
      </div>
    </div>
  );
}
