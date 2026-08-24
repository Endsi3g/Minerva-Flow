"use client";

import type { ReactNode } from "react";

/**
 * Hand-rolled SVG progress ring (no recharts) — used wherever Overview/
 * Impact/Franchise show a single metric's share or progress, replacing the
 * earlier 2-bar recharts comparisons with something lighter and more
 * "dashboard gauge" in feel.
 */
export function RadialGauge({
  value,
  size = 88,
  strokeWidth = 9,
  color = "var(--mv-green)",
  trackColor = "var(--mv-border)",
  centerValue,
  centerLabel,
}: {
  /** 0-100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  centerValue: ReactNode;
  centerLabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="font-display text-[16px] font-medium leading-none text-mv-ink">{centerValue}</span>
        {centerLabel && (
          <span className="mt-1 text-[8px] font-semibold uppercase leading-tight tracking-wide text-mv-ink-faint">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
}
