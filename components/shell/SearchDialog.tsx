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
import { Search, Navigation, Megaphone, Users, FolderKanban, LifeBuoy, Heart, UtensilsCrossed, PackageSearch, ClipboardList } from "lucide-react";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string | null;
}

export function SearchDialog({ open, onOpenChange, restaurantId }: SearchDialogProps) {
  const t = useTranslations("shell");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

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
      className="max-w-[550px] border border-mv-border bg-mv-cream-soft shadow-mv-xl"
    >
      <Command className="bg-transparent border-0 shadow-none">
        <div className="flex items-center border-b border-mv-border/60 px-3 py-2.5">
          <Search className="mr-2 h-4 w-4 shrink-0 text-mv-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex h-9 w-full rounded-md bg-transparent text-[13.5px] font-medium text-mv-ink placeholder:text-mv-ink-faint outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <CommandList className="max-h-[350px] overflow-y-auto px-1 py-2">
          {query && results.length === 0 && !isPending && (
            <CommandEmpty className="py-8 text-center text-[13px] text-mv-ink-faint">
              {t("searchNoResults", { query })}
            </CommandEmpty>
          )}
          {isPending && query && (
            <div className="py-8 text-center text-[13px] text-mv-ink-faint">
              {t("searchInProgress")}
            </div>
          )}
          {!query && (
            <div className="py-8 text-center text-[13px] text-mv-ink-faint">
              {t("searchPrompt")}
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => {
            const Icon = typeIcons[type as SearchResult["type"]] || Search;
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
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-mv-ink-soft hover:bg-mv-ink/[0.05] hover:text-mv-ink cursor-pointer transition-colors"
                  >
                    <Icon className="h-4 w-4 text-mv-ink-faint shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-mv-ink font-semibold">{item.title}</span>
                      {item.subtitle && (
                        <span className="truncate text-[11px] text-mv-ink-faint">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
