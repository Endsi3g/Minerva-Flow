"use client";

import { cn } from "@/lib/utils";
import { Check, Loader2, Circle } from "lucide-react";

export type PipelineStepState = "pending" | "active" | "done";

export function PipelineTracker({
  steps,
}: {
  steps: { label: string; state: PipelineStepState }[];
}) {
  return (
    <div className="mv-animate-in flex flex-wrap items-center gap-2 rounded-2xl border border-mv-border bg-mv-cream-soft px-4 py-3">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none transition-colors",
              step.state === "done" && "bg-mv-green-tint text-mv-green-dark",
              step.state === "active" && "bg-mv-lime-tint text-mv-lime-dark",
              step.state === "pending" && "bg-mv-ink/[0.05] text-mv-ink-faint"
            )}
          >
            {step.state === "done" && <Check size={12} className="mv-check-pop" />}
            {step.state === "active" && <Loader2 size={12} className="animate-spin" />}
            {step.state === "pending" && <Circle size={8} className="fill-current" />}
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="h-px w-4 bg-mv-border" />}
        </div>
      ))}
    </div>
  );
}
