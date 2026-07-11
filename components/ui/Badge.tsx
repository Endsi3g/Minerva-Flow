import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "green" | "lime" | "red" | "amber" | "neutral" | "ink";

const tones: Record<Tone, string> = {
  green: "bg-mv-green-tint text-mv-green-dark",
  lime: "bg-mv-lime-tint text-mv-lime-dark",
  red: "bg-mv-red-bg text-mv-red",
  amber: "bg-mv-amber-bg text-mv-amber",
  neutral: "bg-mv-ink/[0.06] text-mv-ink-soft",
  ink: "bg-mv-ink text-mv-cream-soft",
};

export function Badge({
  tone = "neutral",
  children,
  dot = false,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none",
        tones[tone],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "green" && "bg-mv-green",
            tone === "lime" && "bg-mv-lime-dark",
            tone === "red" && "bg-mv-red",
            tone === "amber" && "bg-mv-amber",
            tone === "neutral" && "bg-mv-ink-soft",
            tone === "ink" && "bg-mv-lime"
          )}
        />
      )}
      {children}
    </span>
  );
}
