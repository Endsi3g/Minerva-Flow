import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type ProgressTone = "green" | "lime" | "amber" | "red" | "blue";

const toneColors: Record<ProgressTone, string> = {
  green: "bg-mv-green",
  lime: "bg-mv-lime-dark",
  amber: "bg-mv-amber",
  red: "bg-mv-red",
  blue: "bg-blue-600",
};

export function ProgressBar({
  value,
  max = 100,
  tone = "green",
  label,
  valueLabel,
  size = "md",
  showPercentage = false,
  className,
}: {
  value: number;
  max?: number;
  tone?: ProgressTone;
  label?: ReactNode;
  valueLabel?: ReactNode;
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  className?: string;
}) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div data-slot="progress-bar" className={cn("w-full", className)}>
      {(label || valueLabel || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          {label && <span className="font-semibold text-mv-ink-soft">{label}</span>}
          <span className="font-mono text-mv-ink-faint">
            {valueLabel ?? (showPercentage ? `${Math.round(percentage)}%` : `${value}/${max}`)}
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-mv-border-soft dark:bg-mv-border",
          heightClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            toneColors[tone] || toneColors.green
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  tone = "green",
  children,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  tone?: ProgressTone;
  children?: ReactNode;
  className?: string;
}) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const strokeColor =
    tone === "green"
      ? "var(--mv-green, #167f5b)"
      : tone === "lime"
      ? "var(--mv-lime-dark, #6d7e1f)"
      : tone === "amber"
      ? "var(--mv-amber, #ab7d1f)"
      : tone === "red"
      ? "var(--mv-red, #b5473a)"
      : "#2563eb";

  return (
    <div
      data-slot="progress-ring"
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--mv-border-soft, #eee9db)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
