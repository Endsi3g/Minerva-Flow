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

  const weeks: (typeof data[number] | null)[][] = [];
  let week: (typeof data[number] | null)[] = new Array(data[0]?.dow ?? 0).fill(null);
  for (const d of data) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return (
    <div>
      <div className="flex gap-[3px]">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {w.map((d, di) =>
              d ? (
                <div
                  key={di}
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                  className="h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125"
                  style={{ background: bucketFor(d.revenue, min, max) }}
                />
              ) : (
                <div key={di} className="h-3.5 w-3.5" />
              )
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
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
