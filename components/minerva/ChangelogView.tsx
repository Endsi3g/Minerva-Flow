"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChangelogMarkdownRenderer } from "@/components/minerva/ChangelogMarkdownRenderer";
import { formatDateFull, formatTime } from "@/lib/utils";
import type { ChangelogEntry, ChangelogCategory } from "@/lib/data/changelog";
import {
  History,
  Search,
  Sparkles,
  Zap,
  Bug,
  Tag,
  Calendar,
  X,
  Filter,
  CheckCircle2,
} from "lucide-react";

const categoryLabel: Record<ChangelogCategory, string> = {
  fonctionnalite: "Nouveauté",
  amelioration: "Amélioration",
  correctif: "Correctif",
};

const categoryTone: Record<ChangelogCategory, "green" | "amber" | "neutral"> = {
  fonctionnalite: "green",
  amelioration: "amber",
  correctif: "neutral",
};

export function ChangelogView({ initialEntries }: { initialEntries: ChangelogEntry[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ChangelogCategory | "all">("all");

  const filteredEntries = useMemo(() => {
    return initialEntries.filter((entry) => {
      const matchCategory = selectedCategory === "all" || entry.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        entry.title.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.publishedAt.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [initialEntries, selectedCategory, search]);

  const counts = useMemo(() => {
    return {
      all: initialEntries.length,
      fonctionnalite: initialEntries.filter((e) => e.category === "fonctionnalite").length,
      amelioration: initialEntries.filter((e) => e.category === "amelioration").length,
      correctif: initialEntries.filter((e) => e.category === "correctif").length,
    };
  }, [initialEntries]);

  return (
    <div className="mx-auto max-w-2xl w-full space-y-6">
      <PageHeader
        eyebrow="Système & Mises à Jour"
        title="Journal des évolutions"
        description="Consultez les nouvelles fonctionnalités, améliorations et correctifs apportés à Flow par Minerva."
      />

      {/* Controls Bar: Search & Category Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-mv-border bg-mv-surface p-3 shadow-mv-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              selectedCategory === "all"
                ? "bg-mv-ink text-mv-cream-soft shadow-sm"
                : "text-mv-ink-soft hover:bg-mv-cream-soft hover:text-mv-ink"
            }`}
          >
            <Tag size={13} />
            Tout
            <span className="ml-0.5 rounded-full bg-mv-ink/10 px-1.5 py-0.2 text-[10px]">
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("fonctionnalite")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              selectedCategory === "fonctionnalite"
                ? "bg-mv-green text-white shadow-sm"
                : "text-mv-ink-soft hover:bg-mv-green/10 hover:text-mv-green-dark"
            }`}
          >
            <Sparkles size={13} />
            Nouveautés
            <span className="ml-0.5 rounded-full bg-mv-green-dark/20 px-1.5 py-0.2 text-[10px]">
              {counts.fonctionnalite}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("amelioration")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              selectedCategory === "amelioration"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-mv-ink-soft hover:bg-amber-500/10 hover:text-amber-700"
            }`}
          >
            <Zap size={13} />
            Améliorations
            <span className="ml-0.5 rounded-full bg-amber-700/20 px-1.5 py-0.2 text-[10px]">
              {counts.amelioration}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategory("correctif")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              selectedCategory === "correctif"
                ? "bg-stone-700 text-white shadow-sm"
                : "text-mv-ink-soft hover:bg-mv-ink/10 hover:text-mv-ink"
            }`}
          >
            <Bug size={13} />
            Correctifs
            <span className="ml-0.5 rounded-full bg-mv-ink/20 px-1.5 py-0.2 text-[10px]">
              {counts.correctif}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-48 sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mv-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par mot-clé…"
            className="w-full rounded-xl border border-mv-border bg-mv-cream-soft/40 py-1.5 pl-8 pr-8 text-[12.5px] text-mv-ink placeholder:text-mv-ink-faint focus:border-mv-green focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mv-ink-faint hover:text-mv-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Timeline entries list */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={History}
          title="Aucune mise à jour ne correspond à vos critères"
          description="Essayez de modifier votre mot-clé de recherche ou réinitialisez les filtres."
        />
      ) : (
        <div className="relative pl-4 sm:pl-8 space-y-8 before:absolute before:left-2 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-mv-border/60">
          {filteredEntries.map((entry, idx) => {
            // Extract version number if present (e.g., v2.9.3)
            const versionMatch = entry.title.match(/v\d+\.\d+(\.\d+)?/i);
            const versionTag = versionMatch ? versionMatch[0] : null;
            const cleanTitle = versionTag ? entry.title.replace(`Version ${versionTag} : `, "").replace(`${versionTag} — `, "") : entry.title;

            return (
              <div key={entry.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-4 sm:-left-8 top-1 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 border-mv-surface bg-mv-cream shadow-sm transition-transform group-hover:scale-110">
                  {entry.category === "fonctionnalite" ? (
                    <Sparkles size={14} className="text-mv-green" />
                  ) : entry.category === "amelioration" ? (
                    <Zap size={14} className="text-amber-600" />
                  ) : (
                    <Bug size={14} className="text-stone-600" />
                  )}
                </div>

                {/* Card Container */}
                <div className="rounded-2xl border border-mv-border bg-mv-surface p-4 sm:p-5 shadow-mv-xs transition-all hover:shadow-mv-md">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mv-border-soft pb-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {versionTag && (
                        <span className="rounded-lg bg-mv-green/10 border border-mv-green/30 px-2.5 py-0.5 font-mono text-[12px] font-bold text-mv-green-dark">
                          {versionTag}
                        </span>
                      )}
                      <Badge tone={categoryTone[entry.category]}>
                        {categoryLabel[entry.category]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-[11.5px] font-medium text-mv-ink-faint">
                      <Calendar size={13} />
                      {formatDateFull(entry.publishedAt.slice(0, 10))} · {formatTime(entry.publishedAt)}
                    </div>
                  </div>

                  <h3 className="font-display text-[16px] sm:text-[17px] font-medium leading-snug text-mv-ink mb-2">
                    {cleanTitle}
                  </h3>

                  <ChangelogMarkdownRenderer
                    content={entry.description}
                    category={entry.category}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
