"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [, startTransition] = useTransition();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("minerva_recent_searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(query);
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(href: string, title: string) {
    // Save to recent searches
    const updated = [title, ...recentSearches.filter((s) => s !== title)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem("minerva_recent_searches", JSON.stringify(updated));
    } catch {}

    setOpen(false);
    router.push(href as any);
  }

  const filteredItems = SEARCH_ITEMS.filter((item) => {
    if (!debouncedQuery.trim()) return true;
    const q = debouncedQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {/* Trigger Button displayed in topbar / header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2.5 rounded-xl border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] text-mv-ink-soft hover:border-mv-green/40 hover:bg-mv-cream-soft transition-all shadow-mv-xs"
        aria-label="Rechercher dans l'application (Cmd+K)"
      >
        <Search size={14} className="text-mv-ink-faint" />
        <span className="hidden sm:inline font-normal">Rechercher un outil, rapport...</span>
        <span className="sm:hidden font-normal">Rechercher</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-mv-border-soft bg-mv-cream px-1.5 text-[10px] font-medium text-mv-ink-faint">
          <span className="text-[11px]">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="bg-mv-surface border-b border-mv-border px-3">
          <CommandInput
            placeholder="Rechercher un outil, rapport, collaborateur (ex: finance, stock, chat)..."
            value={query}
            onValueChange={setQuery}
            className="text-[14px] text-mv-ink placeholder:text-mv-ink-faint font-normal"
          />
        </div>

        <CommandList className="max-h-[380px] p-2 overflow-y-auto">
          <CommandEmpty className="p-6 text-center text-[13px] text-mv-ink-soft">
            <p className="font-normal text-mv-ink">Aucun résultat trouvé pour &quot;{query}&quot;</p>
            <p className="mt-1 text-[12px] text-mv-ink-faint">
              Essayez de rechercher <span className="underline cursor-pointer" onClick={() => setQuery("finance")}>finance</span>, <span className="underline cursor-pointer" onClick={() => setQuery("collaborateurs")}>équipe</span> ou <span className="underline cursor-pointer" onClick={() => setQuery("inventaire")}>stocks</span>.
            </p>
          </CommandEmpty>

          {!query && recentSearches.length > 0 && (
            <CommandGroup heading="Recherches récentes">
              {recentSearches.map((title) => {
                const matched = SEARCH_ITEMS.find((i) => i.title === title);
                if (!matched) return null;
                const Icon = matched.icon;
                return (
                  <CommandItem
                    key={matched.id}
                    onSelect={() => handleSelect(matched.href, matched.title)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] cursor-pointer text-mv-ink hover:bg-mv-green-tint"
                  >
                    <div className="flex items-center gap-2.5">
                      <History size={14} className="text-mv-ink-faint" />
                      <span>{matched.title}</span>
                    </div>
                    <ArrowRight size={13} className="text-mv-ink-faint" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {["Navigation", "Rapports & Finance", "Outils & Équipes"].map((cat) => {
            const catItems = filteredItems.filter((i) => i.category === cat);
            if (catItems.length === 0) return null;

            return (
              <CommandGroup key={cat} heading={cat} className="text-[11px] font-normal uppercase text-mv-ink-faint tracking-wider px-2 pt-2">
                {catItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(item.href, item.title)}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[13.5px] cursor-pointer text-mv-ink hover:bg-mv-green-tint transition-colors my-0.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mv-cream text-mv-green-dark border border-mv-border-soft shrink-0">
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="font-normal text-mv-ink">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-[11.5px] text-mv-ink-faint font-normal line-clamp-1">{item.subtitle}</div>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-mv-ink-faint" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
