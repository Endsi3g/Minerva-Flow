"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type BarListRow = { label: string; value: string; fraction: number };

/**
 * Compact ranked list — a label, a background bar sized to its share of
 * the max value, and the value right-aligned. Dismissible and persisted
 * (localStorage) like GlobalStatsCard, one dismiss key per card so
 * several can coexist on the same page.
 */
export function BarListCard({
  title,
  eyebrow,
  rows,
  dismissKey,
  position = "left-4 top-4",
}: {
  title: string;
  eyebrow: string;
  rows: BarListRow[];
  dismissKey: string;
  position?: string;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  if (dismissed || rows.length === 0) return null;

  function handleDismiss() {
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  }

  return (
    <div className={`absolute ${position} z-10 w-64 rounded-2xl border border-mv-border bg-mv-surface/95 p-4 shadow-mv-lg backdrop-blur-sm`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-mv-ink-faint">{eyebrow}</p>
          <p className="text-[13px] font-semibold text-mv-ink">{title}</p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Retirer cette carte"
          className="rounded-md p-1 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
        >
          <X size={13} />
        </button>
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="relative overflow-hidden rounded-md">
            <div
              className="absolute inset-y-0 left-0 rounded-md bg-mv-green/10"
              style={{ width: `${Math.max(6, row.fraction * 100)}%` }}
            />
            <div className="relative flex items-center justify-between px-2.5 py-1.5">
              <span className="truncate text-[12.5px] font-medium text-mv-ink">{row.label}</span>
              <span className="shrink-0 text-[12.5px] font-semibold text-mv-ink-soft">{row.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
