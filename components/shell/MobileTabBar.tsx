"use client";

import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Truck,
  ClipboardList,
  Building2,
  PackageSearch,
  Check,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useApp } from "@/lib/app-context";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerSwipeHandle,
} from "@/components/ui/drawer";

type TabItem = {
  href: string;
  translationKey: string;
  icon: LucideIcon;
};

/**
 * Four core destinations plus a restaurant switcher drawer.
 */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { role, restaurants, workspaces, restaurantId, setRestaurantId } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs: TabItem[] = [
    { href: "/workspace", translationKey: "workspace", icon: Building2 },
    ...(role === "owner" || role === "manager"
      ? [
          { href: "/fournisseurs", translationKey: "fournisseurs", icon: Truck },
          { href: "/inventaire", translationKey: "inventaire", icon: PackageSearch },
        ]
      : []),
    { href: "/commandes", translationKey: "commandes", icon: ClipboardList },
  ];

  const restaurantGroups = useMemo(() => {
    const groups = new Map<string, { name: string; restaurants: typeof restaurants }>();
    for (const workspace of workspaces) groups.set(workspace.id, { name: workspace.name, restaurants: [] });
    for (const restaurant of restaurants) {
      const id = restaurant.workspaceId ?? `restaurant:${restaurant.id}`;
      const group = groups.get(id) ?? { name: restaurant.name, restaurants: [] };
      group.restaurants.push(restaurant);
      groups.set(id, group);
    }
    return [...groups.entries()].map(([id, group]) => ({ id, ...group }));
  }, [restaurants, workspaces]);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] items-stretch border-t border-mv-border bg-mv-cream-soft/95 backdrop-blur-sm md:hidden">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors",
                active ? "text-mv-green-dark" : "text-mv-ink-faint"
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-mv-green-dark" : undefined} />
              <span>{t(tab.translationKey)}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-mv-ink-faint transition-colors"
        >
          <MoreHorizontal size={19} strokeWidth={1.8} />
          <span>{t("more")}</span>
        </button>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen} showSwipeHandle>
        <DrawerContent className="max-h-[75dvh]">
          <DrawerSwipeHandle className="mx-auto mt-2" />
          <DrawerHeader>
            <DrawerTitle>{t("sectionTeams")}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {restaurantGroups.length > 0 && (
              <section className="mb-4" aria-label={t("sectionTeams")}>
                <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-mv-ink-faint">
                  {t("sectionTeams")}
                </h2>
                <div className="space-y-3">
                  {restaurantGroups.map((group) => (
                    <div key={group.id}>
                      <div className="mb-1 flex items-center gap-1.5 px-1 text-xs font-semibold text-mv-ink-soft">
                        <Building2 size={13} aria-hidden="true" />
                        <span className="truncate">{group.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {group.restaurants.map((restaurant) => {
                          const selected = restaurant.id === restaurantId;
                          return (
                            <button
                              key={restaurant.id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => {
                                setRestaurantId(restaurant.id);
                                setMoreOpen(false);
                              }}
                              className={cn(
                                "flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                                selected ? "bg-mv-green/10 text-mv-green-dark" : "text-mv-ink-soft hover:bg-mv-ink/[0.04]"
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">{restaurant.name.replace("Minerva — ", "")}</span>
                              {selected && <Check size={14} className="shrink-0" aria-hidden="true" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <Link
              href="/workspace"
              onClick={() => setMoreOpen(false)}
              className="flex min-h-11 items-center justify-center rounded-lg border border-mv-border-soft bg-mv-cream-soft px-3 text-xs font-semibold text-mv-green-dark transition-colors hover:bg-mv-green/10"
            >
              {t("allTeams")}
            </Link>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
