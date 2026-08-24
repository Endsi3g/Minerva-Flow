import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type BadgeTone =
  | "green"
  | "lime"
  | "red"
  | "amber"
  | "neutral"
  | "ink"
  | "blue"
  | "purple";

export type BadgeVariant = "subtle" | "outline" | "solid";
export type BadgeSize = "xs" | "sm" | "default" | "lg";

const subtleTones: Record<BadgeTone, string> = {
  green: "bg-mv-green-tint text-mv-green-dark border-transparent",
  lime: "bg-mv-lime-tint text-mv-lime-dark border-transparent",
  red: "bg-mv-red-bg text-mv-red border-transparent",
  amber: "bg-mv-amber-bg text-mv-amber border-transparent",
  neutral: "bg-mv-ink/[0.06] text-mv-ink-soft border-transparent dark:bg-mv-ink/[0.12]",
  ink: "bg-mv-ink text-mv-cream-soft border-transparent",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-transparent",
};

const outlineTones: Record<BadgeTone, string> = {
  green: "border-mv-green/30 text-mv-green-dark bg-transparent",
  lime: "border-mv-lime-dark/30 text-mv-lime-dark bg-transparent",
  red: "border-mv-red/30 text-mv-red bg-transparent",
  amber: "border-mv-amber/30 text-mv-amber bg-transparent",
  neutral: "border-mv-border text-mv-ink-soft bg-transparent",
  ink: "border-mv-ink/30 text-mv-ink bg-transparent",
  blue: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-transparent",
  purple: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-transparent",
};

const solidTones: Record<BadgeTone, string> = {
  green: "bg-mv-green text-mv-cream-soft border-transparent",
  lime: "bg-mv-lime text-white border-transparent",
  red: "bg-mv-red text-white border-transparent",
  amber: "bg-mv-amber text-white border-transparent",
  neutral: "bg-mv-ink-soft text-mv-cream-soft border-transparent",
  ink: "bg-mv-ink text-mv-cream-soft border-transparent",
  blue: "bg-blue-600 text-white border-transparent",
  purple: "bg-purple-600 text-white border-transparent",
};

const dotColors: Record<BadgeTone, string> = {
  green: "bg-mv-green",
  lime: "bg-mv-lime-dark",
  red: "bg-mv-red",
  amber: "bg-mv-amber",
  neutral: "bg-mv-ink-soft",
  ink: "bg-mv-lime",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: "px-1.5 py-0.5 text-[10px] gap-1",
  sm: "px-2 py-0.5 text-[11px] gap-1",
  default: "px-2.5 py-1 text-[12px] gap-1.5",
  lg: "px-3 py-1.5 text-[13px] gap-2",
};

export function Badge({
  tone = "neutral",
  variant = "subtle",
  size = "default",
  children,
  dot = false,
  pulse = false,
  className,
}: {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  const variantMap =
    variant === "solid"
      ? solidTones
      : variant === "outline"
      ? outlineTones
      : subtleTones;

  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-semibold leading-none whitespace-nowrap transition-colors",
        variantMap[tone] || subtleTones.neutral,
        sizeClasses[size] || sizeClasses.default,
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                dotColors[tone] || "bg-mv-ink-soft"
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              dotColors[tone] || "bg-mv-ink-soft"
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}

