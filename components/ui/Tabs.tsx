"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-mv-border bg-mv-cream-soft p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
            active === t.id
              ? "bg-mv-surface text-mv-ink shadow-mv-sm"
              : "text-mv-ink-soft hover:text-mv-ink"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
