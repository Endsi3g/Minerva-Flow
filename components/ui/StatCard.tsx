import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type StatCardAccent =
  | "green"
  | "lime"
  | "ink"
  | "amber"
  | "red"
  | "blue"
  | "purple";

const accentIconBg: Record<StatCardAccent, string> = {
  green: "bg-mv-green-tint text-mv-green-dark dark:bg-mv-green-tint dark:text-mv-green-dark",
  lime: "bg-mv-lime-tint text-mv-lime-dark dark:bg-mv-lime-tint dark:text-mv-lime-dark",
  ink: "bg-mv-ink/[0.06] text-mv-ink-soft dark:bg-mv-ink/[0.12] dark:text-mv-ink",
  amber: "bg-mv-amber-bg text-mv-amber dark:bg-mv-amber-bg dark:text-mv-amber",
  red: "bg-mv-red-bg text-mv-red dark:bg-mv-red-bg dark:text-mv-red",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  sublabel,
  accent = "green",
  className,
  onClick,
  footer,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  icon: LucideIcon;
  sublabel?: string;
  accent?: StatCardAccent;
  className?: string;
  onClick?: () => void;
  footer?: ReactNode;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      data-slot="stat-card"
      onClick={onClick}
      className={cn(
        "group relative flex flex-1 flex-col justify-between rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm transition-all duration-200",
        onClick &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-mv-md hover:border-mv-green/40",
        className
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-mv-ink-faint">
            {label}
          </p>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105",
              accentIconBg[accent] || accentIconBg.green
            )}
          >
            <Icon size={16} strokeWidth={2.2} />
          </div>
        </div>
        <p className="mt-2.5 font-display text-[28px] font-medium leading-none text-mv-ink tracking-tight">
          {value}
        </p>
      </div>

      <div className="mt-3">
        {(delta !== undefined || sublabel) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
            {delta !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold",
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
            {sublabel && (
              <span className="text-mv-ink-faint truncate">{sublabel}</span>
            )}
          </div>
        )}
        {footer && <div className="mt-3 pt-3 border-t border-mv-border-soft">{footer}</div>}
      </div>
    </div>
  );
}

