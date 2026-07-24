"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  LayoutDashboard,
  Bot,
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  FileText,
  AlertTriangle,
  History,
  ArrowRight,
  X,
} from "lucide-react";

interface SearchResultItem {
  id: string;
  title: string;
  category: "Navigation" | "Rapports & Finance" | "Outils & Équipes";
  href: string;
  icon: any;
  subtitle?: string;
}

const SEARCH_ITEMS: SearchResultItem[] = [
  { id: "overview", title: "Aperçu Général", category: "Navigation", href: "/overview", icon: LayoutDashboard, subtitle: "Tableau de bord & KPIs d'exploitation" },
  { id: "assistant", title: "Flow AI", category: "Navigation", href: "/assistant", icon: Bot, subtitle: "Assistant virtuel intelligent & prédictions" },
  { id: "finance", title: "Finance & Seuil de Rentabilité", category: "Rapports & Finance", href: "/finance", icon: TrendingUp, subtitle: "Simulateur de point mort & marge brute" },
  { id: "commandes", title: "Commandes & Ventes", category: "Outils & Équipes", href: "/commandes", icon: ShoppingCart, subtitle: "Ventes POS, historiques & tickets" },
  { id: "collaborateurs", title: "Collaborateurs & Équipe", category: "Outils & Équipes", href: "/collaborateurs", icon: Users, subtitle: "Membres de l'équipe & Chat d'équipe" },
  { id: "inventaire", title: "Inventaire & Stocks", category: "Outils & Équipes", href: "/inventaire", icon: Package, subtitle: "Pertes, gestion des ingrédients & fournisseurs" },
  { id: "incidents", title: "Rapports d'Incidents & Urgences", category: "Outils & Équipes", href: "/admin/incidents", icon: AlertTriangle, subtitle: "Signalement rapide d'imprévus & photos" },
  { id: "reports-be", title: "Seuil de Rentabilité", category: "Rapports & Finance", href: "/reports/seuil-rentabilite", icon: FileText, subtitle: "Calcul automatique du chiffre d'affaires équilibre" },
  { id: "reports-fc", title: "Food Cost & Pertes", category: "Rapports & Finance", href: "/reports/food-cost", icon: FileText, subtitle: "Optimisation de la marge sur les matières premières" },
  { id: "reports-daily", title: "Performance des Journées", category: "Rapports & Finance", href: "/reports/journalieres", icon: FileText, subtitle: "Comparatif météo, événements & fréquentation" },
];

export function GlobalSearchModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", down, true);
    return () => window.removeEventListener("keydown", down, true);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);


  function handleSelect(href: string, title: string) {
    const updated = [title, ...recentSearches.filter((s) => s !== title)].slice(0, 5);
    setRecentSearches(updated);

    setOpen(false);
    startTransition(() => {
      router.push(href as any);
    });
  }

  const filteredItems = SEARCH_ITEMS.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  });

  const categories = ["Navigation", "Rapports & Finance", "Outils & Équipes"] as const;

  return (
    <>
      {/* Trigger Button displayed in topbar */}
      <button
        onClick={() => setOpen(true)}
        id="global-search-trigger"
        aria-label="Rechercher dans l'application (⌘K)"
        className="flex items-center gap-2.5 rounded-xl border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] text-mv-ink-soft hover:border-mv-green/40 hover:bg-mv-cream-soft transition-all shadow-mv-xs"
      >
        <Search size={14} className="text-mv-ink-faint" />
        <span className="hidden sm:inline font-normal">Rechercher un outil, rapport...</span>
        <span className="sm:hidden font-normal">Rechercher</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-mv-border-soft bg-mv-cream px-1.5 text-[10px] font-medium text-mv-ink-faint">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Recherche globale</DialogTitle>
          <DialogDescription>Rechercher un outil ou un rapport dans Minerva Flow</DialogDescription>
        </DialogHeader>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl bg-mv-surface border border-mv-border shadow-mv-xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-mv-border px-4 py-3.5">
            <Search size={16} className="shrink-0 text-mv-ink-faint" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Rechercher un outil, rapport (ex: finance, stock, chat)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredItems.length > 0) {
                  handleSelect(filteredItems[0].href, filteredItems[0].title);
                }
              }}
              className="flex-1 bg-transparent text-[14px] text-mv-ink placeholder:text-mv-ink-faint outline-none font-normal"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-mv-ink-faint hover:text-mv-ink transition-colors">
                <X size={14} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-mv-border-soft bg-mv-cream px-1.5 text-[10px] text-mv-ink-faint">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[380px] overflow-y-auto p-2">
            {/* Recent searches (shown when query is empty) */}
            {!query.trim() && recentSearches.length > 0 && (
              <div className="mb-1">
                <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-mv-ink-faint">
                  Recherches récentes
                </p>
                {recentSearches.map((title) => {
                  const matched = SEARCH_ITEMS.find((i) => i.title === title);
                  if (!matched) return null;
                  const Icon = matched.icon;
                  return (
                    <button
                      key={matched.id}
                      onClick={() => handleSelect(matched.href, matched.title)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] text-mv-ink hover:bg-mv-green-tint transition-colors my-0.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <History size={14} className="text-mv-ink-faint shrink-0" />
                        <span className="font-normal">{matched.title}</span>
                      </div>
                      <ArrowRight size={13} className="text-mv-ink-faint" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filtered results grouped by category */}
            {filteredItems.length === 0 ? (
              <div className="p-6 text-center">
                <p className="font-normal text-mv-ink text-[13px]">Aucun résultat pour &quot;{query}&quot;</p>
                <p className="mt-1 text-[12px] text-mv-ink-faint font-normal">
                  Essayez{" "}
                  <button className="underline" onClick={() => setQuery("finance")}>finance</button>
                  ,{" "}
                  <button className="underline" onClick={() => setQuery("équipe")}>équipe</button>
                  {" "}ou{" "}
                  <button className="underline" onClick={() => setQuery("inventaire")}>stocks</button>.
                </p>
              </div>
            ) : (
              categories.map((cat) => {
                const catItems = filteredItems.filter((i) => i.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat} className="mb-1">
                    <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-mv-ink-faint">
                      {cat}
                    </p>
                    {catItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.href, item.title)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] text-mv-ink hover:bg-mv-green-tint transition-colors my-0.5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mv-cream text-mv-green-dark border border-mv-border-soft shrink-0">
                              <Icon size={16} />
                            </div>
                            <div className="text-left">
                              <div className="font-normal text-mv-ink">{item.title}</div>
                              {item.subtitle && (
                                <div className="text-[11.5px] text-mv-ink-faint font-normal line-clamp-1">{item.subtitle}</div>
                              )}
                            </div>
                          </div>
                          <ArrowRight size={14} className="text-mv-ink-faint shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
