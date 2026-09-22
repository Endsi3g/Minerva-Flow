"use client";

import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface EditorialLoadingStateProps {
  title?: string;
  subtitle?: string;
  rows?: number;
  className?: string;
}

export function EditorialLoadingState({
  title = "Chargement en cours…",
  subtitle = "Synchronisation des flux et vérification des données de l'établissement.",
  rows = 3,
  className,
}: EditorialLoadingStateProps) {
  return (
    <div className={cn("space-y-4 animate-in fade-in duration-300", className)}>
      {/* Header text with luxury micro-badge */}
      <div className="flex items-center gap-2.5 px-0.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-mv-green/10 text-mv-green-dark">
          <RefreshCw size={11} className="animate-spin" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-mv-ink">{title}</p>
          {subtitle && (
            <p className="text-[11.5px] text-mv-ink-faint">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Shimmer items */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-mv-border/60 bg-mv-surface/70 p-4 shadow-mv-sm backdrop-blur-xs"
          >
            <div className="flex items-start gap-3.5">
              {/* Shimmer icon avatar */}
              <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-r from-mv-border/20 via-mv-border/40 to-mv-border/20 animate-pulse" />

              {/* Shimmer content lines */}
              <div className="flex-1 space-y-2.5 py-0.5">
                <div className="flex items-center justify-between gap-4">
                  <div
                    className="h-4 rounded-md bg-gradient-to-r from-mv-border/20 via-mv-border/40 to-mv-border/20 animate-pulse"
                    style={{ width: `${60 - (i % 3) * 15}%` }}
                  />
                  <div className="h-5 w-10 rounded-full bg-gradient-to-r from-mv-border/20 via-mv-border/40 to-mv-border/20 animate-pulse" />
                </div>
                <div
                  className="h-3 rounded-md bg-gradient-to-r from-mv-border/15 via-mv-border/30 to-mv-border/15 animate-pulse"
                  style={{ width: `${80 - (i % 2) * 20}%` }}
                />
                <div className="pt-2 flex items-center gap-3">
                  <div className="h-6 w-24 rounded-md bg-gradient-to-r from-mv-border/20 via-mv-border/35 to-mv-border/20 animate-pulse" />
                  <div className="h-4 w-16 rounded bg-gradient-to-r from-mv-border/15 via-mv-border/30 to-mv-border/15 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
