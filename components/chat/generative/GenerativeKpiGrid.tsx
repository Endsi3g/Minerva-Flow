"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import type { GenerativeKpiGridData, GenerativeKpiItem } from "@/lib/types/generative-ui";
import { cn, formatCurrency } from "@/lib/utils";

function formatValue(value: number, unit: GenerativeKpiItem["unit"]): string {
  switch (unit) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return `${value.toFixed(1)} %`;
    case "hours":
      return `${value.toFixed(1)} h`;
    case "number":
    default:
      return value.toLocaleString("fr-CA");
  }
}

export function GenerativeKpiGrid({
  data,
  onMetricClick,
}: {
  data: GenerativeKpiGridData;
  onMetricClick?: (item: GenerativeKpiItem) => void;
}) {
  if (!data?.items || data.items.length === 0) return null;

  return (
    <div className="space-y-2.5 my-3">
      {data.title && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#0A3F2F] tracking-tight uppercase font-mono">
            {data.title}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {data.items.map((item) => {
          const isUp = (item.deltaPercent ?? 0) > 0;
          const isNeutral = (item.deltaPercent ?? 0) === 0;

          return (
            <div
              key={item.id}
              onClick={() => onMetricClick?.(item)}
              className={cn(
                "group relative flex flex-col justify-between p-3 rounded-2xl bg-white border border-[#E8E5DF] shadow-2xs hover:border-[#0E7C5A]/50 hover:shadow-xs transition-all cursor-pointer",
                item.status === "critical" && "border-rose-300 bg-rose-50/30",
                item.status === "warning" && "border-amber-300 bg-amber-50/30",
                item.status === "optimal" && "border-emerald-200"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-[#5A5851] truncate max-w-[85%]">
                  {item.label}
                </span>
                {item.tooltip && (
                  <span title={item.tooltip} className="text-[#8A887F] hover:text-[#1F1E1D]">
                    <Info size={11} />
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="font-sans font-bold text-base sm:text-lg text-[#1F1E1D] tracking-tight">
                  {formatValue(item.value, item.unit)}
                </div>

                {item.deltaPercent !== undefined && (
                  <div className="flex items-center gap-1 text-[10.5px] font-semibold">
                    {isNeutral ? (
                      <span className="flex items-center text-gray-500">
                        <Minus size={11} className="mr-0.5" />
                        0.0%
                      </span>
                    ) : isUp ? (
                      <span
                        className={cn(
                          "flex items-center",
                          item.isPositive !== false ? "text-emerald-700" : "text-rose-700"
                        )}
                      >
                        <TrendingUp size={11} className="mr-0.5" />
                        +{item.deltaPercent.toFixed(1)}%
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "flex items-center",
                          item.isPositive !== false ? "text-rose-700" : "text-emerald-700"
                        )}
                      >
                        <TrendingDown size={11} className="mr-0.5" />
                        {item.deltaPercent.toFixed(1)}%
                      </span>
                    )}

                    {item.deltaLabel && (
                      <span className="text-[#8A887F] font-normal truncate">
                        {item.deltaLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Progress bar towards target */}
              {item.progressPercent !== undefined && (
                <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      item.progressPercent >= 100
                        ? "bg-emerald-600"
                        : item.progressPercent >= 60
                        ? "bg-[#0E7C5A]"
                        : "bg-amber-500"
                    )}
                    style={{ width: `${Math.min(item.progressPercent, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
