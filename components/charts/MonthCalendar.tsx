"use client";

import { bucketFor, heatmapBuckets } from "./heatmap-scale";
import { cn, formatCurrency } from "@/lib/utils";

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];

export function MonthCalendar({
  data,
  selectedDate,
  onSelectDate,
  eventsByDate = {},
}: {
  data: { date: string; revenue: number; dow: number }[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  eventsByDate?: Record<string, boolean>;
}) {
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
    <div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {weekdays.map((w, i) => (
          <div
            key={i}
            className="pb-1 text-center text-[10.5px] sm:text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint"
          >
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dayNum = Number(d.date.slice(-2));
          const bg = bucketFor(d.revenue, min, max);
          const isSelected = d.date === selectedDate;
          const hasEvent = eventsByDate[d.date];
          const isLight = bg === heatmapBuckets[0] || bg === heatmapBuckets[1];
          return (
            <button
              key={i}
              onClick={() => onSelectDate?.(d.date)}
              style={{ background: bg }}
              className={cn(
                "group relative flex aspect-square flex-col items-start justify-between rounded-lg p-1 sm:p-2 text-left transition-transform hover:z-10 hover:scale-[1.06] hover:shadow-mv-md",
                isSelected && "ring-2 ring-mv-green ring-offset-2 ring-offset-mv-surface"
              )}
            >
              <span
                className={cn(
                  "text-[10.5px] sm:text-[11.5px] font-bold leading-none",
                  isLight ? "text-mv-ink" : "text-white drop-shadow-sm"
                )}
              >
                {dayNum}
              </span>
              {hasEvent && (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isLight ? "bg-mv-green" : "bg-mv-lime"
                  )}
                />
              )}
              <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-mv-ink px-2 py-1 text-[11px] font-medium text-mv-cream-soft opacity-0 shadow-mv-md transition-opacity group-hover:opacity-100">
                {formatCurrency(d.revenue)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5">
        <span className="text-[11px] text-mv-ink-faint">Faible</span>
        {heatmapBuckets.map((c) => (
          <div key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
        ))}
        <span className="text-[11px] text-mv-ink-faint">Fort</span>
      </div>
    </div>
  );
}
