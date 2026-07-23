"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange?: (value: number) => void;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, min, max, step = 1, onValueChange, onChange, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center py-2", className)}>
        <div className="relative h-2 w-full flex-1 overflow-hidden rounded-full bg-mv-border/60">
          <div
            className="absolute h-full bg-mv-green-dark transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          ref={ref}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const val = Number(e.target.value);
            onValueChange?.(val);
            onChange?.(e);
          }}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          {...props}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-mv-green-dark bg-mv-surface shadow-mv-sm transition-all"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";
