import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  sublabel,
  accent = "green",
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  icon: LucideIcon;
  sublabel?: string;
  accent?: "green" | "lime" | "ink";
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="flex-1 rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
      <div className="flex items-start justify-between">
        <p className="text-[12.5px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          {label}
        </p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            accent === "green" && "bg-mv-green-tint text-mv-green-dark",
            accent === "lime" && "bg-mv-lime-tint text-mv-lime-dark",
            accent === "ink" && "bg-mv-ink/[0.06] text-mv-ink-soft"
          )}
        >
          <Icon size={16} strokeWidth={2.2} />
        </div>
      </div>
      <p className="mt-3 font-display text-[28px] font-medium leading-none text-mv-ink">
        {value}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[12.5px] font-semibold",
              positive ? "text-mv-green-dark" : "text-mv-red"
            )}
          >
            {positive ? (
              <ArrowUpRight size={14} strokeWidth={2.5} />
            ) : (
              <ArrowDownRight size={14} strokeWidth={2.5} />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {sublabel && <span className="text-[12.5px] text-mv-ink-faint">{sublabel}</span>}
      </div>
    </div>
  );
}
