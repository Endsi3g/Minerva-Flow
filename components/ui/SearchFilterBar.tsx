"use client";

import { cn } from "@/lib/utils";
import { Search, X, SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type FilterCategory = {
  id: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
};

export function SearchFilterBar({
  searchValue,
  onSearchChange,
  placeholder = "Rechercher...",
  categories,
  selectedCategoryId,
  onSelectCategory,
  actions,
  extraFilters,
  className,
  showShortcut = true,
}: {
  searchValue: string;
  onSearchChange: (val: string) => void;
  placeholder?: string;
  categories?: FilterCategory[];
  selectedCategoryId?: string;
  onSelectCategory?: (id: string) => void;
  actions?: ReactNode;
  extraFilters?: ReactNode;
  className?: string;
  showShortcut?: boolean;
}) {
  return (
    <div
      data-slot="search-filter-bar"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input Container */}
        <div className="relative flex-1 min-w-[240px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mv-ink-faint pointer-events-none"
          />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="h-10 w-full rounded-xl border border-mv-border bg-mv-surface pl-10 pr-10 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint shadow-mv-sm transition-all focus:border-mv-green focus:outline-none focus:ring-2 focus:ring-mv-green/15"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-mv-ink-faint hover:text-mv-ink hover:bg-mv-ink/5"
            >
              <X size={14} />
            </button>
          ) : showShortcut ? (
            <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border border-mv-border bg-mv-cream-soft px-1.5 py-0.5 text-[10px] font-mono text-mv-ink-faint pointer-events-none">
              ⌘K
            </kbd>
          ) : null}
        </div>

        {/* Actions & Filters Slot */}
        {(extraFilters || actions) && (
          <div className="flex items-center gap-2 shrink-0">
            {extraFilters}
            {actions}
          </div>
        )}
      </div>

      {/* Category Pills */}
      {categories && categories.length > 0 && onSelectCategory && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap transition-all duration-150 cursor-pointer",
                  isSelected
                    ? "bg-mv-ink text-mv-cream-soft shadow-mv-sm"
                    : "bg-mv-surface border border-mv-border text-mv-ink-soft hover:bg-mv-cream-soft hover:text-mv-ink"
                )}
              >
                {Icon && <Icon size={13} className="shrink-0" />}
                <span>{cat.label}</span>
                {cat.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10.5px] font-semibold",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-mv-ink/5 text-mv-ink-faint"
                    )}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
