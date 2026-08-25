"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChangelogMarkdownRenderer } from "@/components/minerva/ChangelogMarkdownRenderer";
import { formatDateFull } from "@/lib/utils";
import type { ChangelogEntry, ChangelogCategory } from "@/lib/data/changelog";
import { History, Search, X } from "lucide-react";

const categoryLabel: Record<ChangelogCategory, string> = {
  fonctionnalite: "Nouveauté",
  amelioration: "Amélioration",
  correctif: "Correctif",
};

const FILTERS: { value: ChangelogCategory | "all"; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "fonctionnalite", label: "Nouveautés" },
  { value: "amelioration", label: "Améliorations" },
  { value: "correctif", label: "Correctifs" },
];

export function ChangelogView({ initialEntries }: { initialEntries: ChangelogEntry[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ChangelogCategory | "all">("all");

  const filteredEntries = useMemo(() => {
    return initialEntries.filter((entry) => {
      const matchCategory = selectedCategory === "all" || entry.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q || entry.title.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [initialEntries, selectedCategory, search]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-10">
      <PageHeader
        eyebrow="Système & Mises à Jour"
        title="Journal des évolutions"
        description="Nouveautés, améliorations et correctifs apportés à Flow par Minerva."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-[13px]">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedCategory(f.value)}
              className={`pb-0.5 font-medium transition-colors ${
                selectedCategory === f.value
                  ? "border-b-2 border-mv-ink text-mv-ink"
                  : "border-b-2 border-transparent text-mv-ink-faint hover:text-mv-ink-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mv-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-40 rounded-lg border border-transparent bg-transparent py-1 pl-7 pr-6 text-[12.5px] text-mv-ink placeholder:text-mv-ink-faint transition-colors focus:border-mv-border focus:bg-mv-surface focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-mv-ink-faint hover:text-mv-ink"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={History}
          title="Aucune mise à jour ne correspond à vos critères"
          description="Essayez un autre mot-clé ou réinitialisez les filtres."
        />
      ) : (
        <div className="divide-y divide-mv-border-soft">
          {filteredEntries.map((entry) => {
            const versionMatch = entry.title.match(/v\d+\.\d+(\.\d+)?/i);
            const versionTag = versionMatch ? versionMatch[0] : null;
            const cleanTitle = versionTag
              ? entry.title.replace(`Version ${versionTag} : `, "").replace(`${versionTag} — `, "")
              : entry.title;

            return (
              <article key={entry.id} className="py-8 first:pt-0">
                <div className="mb-2 flex items-center gap-2 text-[11.5px] text-mv-ink-faint">
                  <time>{formatDateFull(entry.publishedAt.slice(0, 10))}</time>
                  <span aria-hidden>·</span>
                  <span>{categoryLabel[entry.category]}</span>
                  {versionTag && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="font-mono">{versionTag}</span>
                    </>
                  )}
                </div>

                <h3 className="mb-3 font-display text-[18px] font-medium leading-snug text-mv-ink">
                  {cleanTitle}
                </h3>

                {entry.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.imageUrl}
                    alt=""
                    className="mb-4 w-full rounded-lg object-cover"
                  />
                )}

                <ChangelogMarkdownRenderer content={entry.description} category={entry.category} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
