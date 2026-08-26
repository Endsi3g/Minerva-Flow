"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchEverythingAction, type SearchResult } from "@/app/[locale]/(app)/search-actions";
import { navItemsForRole } from "@/lib/nav-items";
import { useApp } from "@/lib/app-context";
import {
  Search,
  Navigation,
  Megaphone,
  Users,
  FolderKanban,
  LifeBuoy,
  Heart,
  UtensilsCrossed,
  PackageSearch,
  ClipboardList,
  Zap,
  Settings,
  CornerDownLeft,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string | null;
  /** Only one instance should listen globally — set true on the topbar's instance, leave false on the sidebar's. */
  enableGlobalShortcut?: boolean;
}

const DEFAULT_QUICK_ACTIONS = [
  {
    title: "Enregistrer un service (CA du jour)",
    subtitle: "Saisir les recettes et le rush du jour",
    href: "/days",
    icon: Sparkles,
  },
  {
    title: "Planifier un quart d'horaire",
    subtitle: "Assigner un horaire ou quart de travail",
    href: "/horaire",
    icon: Users,
  },
  {
    title: "Ouvrir l'Écran Cuisine (KDS)",
    subtitle: "Tickets live et temps de préparation",
    href: "/commandes",
    icon: ClipboardList,
  },
  {
    title: "Générer les QR Codes de table",
    subtitle: "Menu direct sans commission 0%",
    href: "/etablissement",
    icon: Zap,
  },
];

export function SearchDialog({ open, onOpenChange, restaurantId, enableGlobalShortcut }: SearchDialogProps) {
  const t = useTranslations("shell");
  const router = useRouter();
  const { role, sidebarPermissions } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const suggestedItems = navItemsForRole(role, sidebarPermissions);

  useEffect(() => {
    if (!enableGlobalShortcut) return;
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [enableGlobalShortcut, open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (query.trim() === "") {
      setResults([]);
      return;
    }

    startTransition(async () => {
      const data = await searchEverythingAction(restaurantId, query);
      setResults(data);
    });
  }, [query, restaurantId]);

  function handleSelect(href: string) {
    onOpenChange(false);
    router.push(href);
    router.refresh();
  }

  const grouped = results.reduce<Record<SearchResult["type"], SearchResult[]>>(
    (acc, curr) => {
      if (!acc[curr.type]) {
        acc[curr.type] = [];
      }
      acc[curr.type].push(curr);
      return acc;
    },
    {} as Record<SearchResult["type"], SearchResult[]>
  );

  const typeLabels: Record<SearchResult["type"], string> = {
    action: "Actions Rapides",
    setting: "Paramètres & Outils",
    navigation: t("searchTypeNavigation"),
    campaign: t("searchTypeCampaign"),
    employee: t("searchTypeEmployee"),
    program: t("searchTypeProgram"),
    support: t("searchTypeSupport"),
    customer: t("searchTypeCustomer"),
    menu_item: t("searchTypeMenuItem"),
    inventory_item: t("searchTypeInventoryItem"),
    order: t("searchTypeOrder"),
  };

  const typeIcons: Record<SearchResult["type"], any> = {
    action: Zap,
    setting: Settings,
    navigation: Navigation,
    campaign: Megaphone,
    employee: Users,
    program: FolderKanban,
    support: LifeBuoy,
    customer: Heart,
    menu_item: UtensilsCrossed,
    inventory_item: PackageSearch,
    order: ClipboardList,
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("searchDialogTitle")}
      description={t("searchDialogDescription")}
      className="max-w-[580px] border border-mv-border bg-mv-cream-soft shadow-mv-xl rounded-2xl overflow-hidden p-0"
    >
      <Command className="bg-transparent border-0 shadow-none">
        <div className="flex items-center border-b border-mv-border/60 px-3.5 py-3">
          <Search className="mr-2.5 h-4 w-4 shrink-0 text-mv-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex h-9 w-full rounded-md bg-transparent text-[14px] font-medium text-mv-ink placeholder:text-mv-ink-faint outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[11px] font-medium text-mv-ink-faint hover:text-mv-ink px-1.5 py-0.5 rounded bg-mv-ink/5"
            >
              Effacer
            </button>
          )}
        </div>
        <CommandList className="max-h-[380px] overflow-y-auto px-1.5 py-2">
          {query && results.length === 0 && !isPending && (
            <CommandEmpty className="py-8 text-center text-[13px] text-mv-ink-faint">
              {t("searchNoResults", { query })}
            </CommandEmpty>
          )}
          {isPending && query && (
            <div className="py-8 text-center text-[13px] text-mv-ink-faint flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mv-green border-t-transparent" />
              {t("searchInProgress")}
            </div>
          )}

          {!query && (
            <>
              {/* Quick Actions Shortcuts */}
              <CommandGroup heading="Actions Rapides" className="text-mv-ink-faint">
                {DEFAULT_QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <CommandItem
                      key={action.href}
                      value={action.title + " " + action.subtitle}
                      onSelect={() => handleSelect(action.href)}
                      className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-medium text-mv-ink-soft hover:bg-mv-ink/[0.05] hover:text-mv-ink cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
                          <Icon size={14} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-mv-ink font-semibold">{action.title}</span>
                          <span className="truncate text-[11px] text-mv-ink-faint">{action.subtitle}</span>
                        </div>
                      </div>
                      <Badge tone="green" className="text-[10px] uppercase font-bold tracking-wider">
                        Action
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {/* Suggested Navigation */}
              <CommandGroup heading={t("searchSuggestedHeading")} className="text-mv-ink-faint mt-1">
                {suggestedItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.title + " " + item.subtitle}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-mv-ink-soft hover:bg-mv-ink/[0.05] hover:text-mv-ink cursor-pointer transition-colors"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mv-cream text-mv-ink-soft">
                      <Navigation size={14} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-mv-ink font-semibold">{item.title}</span>
                      <span className="truncate text-[11px] text-mv-ink-faint">{item.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Grouped Query Results */}
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = typeIcons[type as SearchResult["type"]] || Search;
            const isActionType = type === "action";
            const isSettingType = type === "setting";

            return (
              <CommandGroup
                key={type}
                heading={typeLabels[type as SearchResult["type"]]}
                className="text-mv-ink-faint"
              >
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.title + " " + (item.subtitle || "")}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-medium text-mv-ink-soft hover:bg-mv-ink/[0.05] hover:text-mv-ink cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          isActionType
                            ? "bg-mv-green-tint text-mv-green-dark"
                            : isSettingType
                            ? "bg-mv-cream text-mv-ink-soft"
                            : "bg-mv-cream text-mv-ink-faint"
                        )}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-mv-ink font-semibold">{item.title}</span>
                        {item.subtitle && (
                          <span className="truncate text-[11px] text-mv-ink-faint">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.badge && (
                      <Badge
                        tone={isActionType ? "green" : "neutral"}
                        className="text-[10px] uppercase font-bold tracking-wider shrink-0 ml-2"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>

        {/* Command Palette Keyboard Hints Footer */}
        <div className="flex items-center justify-between border-t border-mv-border/60 bg-mv-surface/60 px-3.5 py-2 text-[11px] text-mv-ink-faint">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-mv-border bg-mv-surface px-1.5 py-0.5 font-mono text-[10px] shadow-mv-xs">
                ↵
              </kbd>
              Ouvrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-mv-border bg-mv-surface px-1.5 py-0.5 font-mono text-[10px] shadow-mv-xs">
                ↑↓
              </kbd>
              Naviguer
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-mv-border bg-mv-surface px-1.5 py-0.5 font-mono text-[10px] shadow-mv-xs">
              ESC
            </kbd>
            Fermer
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
