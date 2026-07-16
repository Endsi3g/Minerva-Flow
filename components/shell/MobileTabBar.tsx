"use client";

import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Sparkles,
  Database,
  FileBarChart2,
  MoreHorizontal,
  GitCommit,
  BarChart3,
  Boxes,
  Map as MapIcon,
  CalendarClock,
  CalendarDays,
  Truck,
  Users,
  User,
  Settings,
  CreditCard,
  BookOpen,
  LifeBuoy,
  History,
  Wallet,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerSwipeHandle,
} from "@/components/ui/drawer";
import type { Role } from "@/lib/types";

type TabItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type MoreItem = TabItem & { roles: Role[] };

const allRoles: Role[] = ["owner", "manager", "staff", "consultant"];

const MORE_ITEMS: MoreItem[] = [
  { href: "/programs", label: "Programmes", icon: GitCommit, roles: allRoles },
  { href: "/days", label: "Journées", icon: BarChart3, roles: allRoles },
  { href: "/employees", label: "Employés", icon: Boxes, roles: ["owner", "manager"] },
  { href: "/maps", label: "Cartes", icon: MapIcon, roles: allRoles },
  { href: "/finance", label: "Finance", icon: Wallet, roles: ["owner", "manager"] },
  { href: "/depenses", label: "Dépenses", icon: TrendingDown, roles: ["owner", "manager"] },
  { href: "/reservations", label: "Réservations", icon: CalendarClock, roles: allRoles },
  { href: "/horaire", label: "Horaire", icon: CalendarDays, roles: allRoles },
  { href: "/fournisseurs", label: "Fournisseurs", icon: Truck, roles: ["owner", "manager"] },
  { href: "/collaborateurs", label: "Collaborateurs", icon: Users, roles: ["owner", "manager"] },
  { href: "/profil", label: "Profil", icon: User, roles: allRoles },
  { href: "/settings", label: "Paramètres", icon: Settings, roles: ["owner", "manager"] },
  { href: "/billing", label: "Facturation", icon: CreditCard, roles: ["owner"] },
  { href: "/guide", label: "Guide", icon: BookOpen, roles: allRoles },
  { href: "/support", label: "Aide & Support", icon: LifeBuoy, roles: allRoles },
  { href: "/changelog", label: "Nouveautés", icon: History, roles: allRoles },
];

/**
 * Fixed 5-tab bottom navigation shown only on mobile (<768px): 4 fixed
 * destinations plus a "Plus" tab that opens a swipeable bottom drawer with
 * everything else, instead of trying to cram the whole sidebar into 5 slots.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { role } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs: TabItem[] = [
    { href: "/overview", label: "Accueil", icon: LayoutGrid },
    { href: "/assistant", label: "Chat IA", icon: Sparkles },
    { href: "/data", label: "Données", icon: Database },
    { href: "/reports", label: "Rapports", icon: FileBarChart2 },
  ];

  const visibleMoreItems = MORE_ITEMS.filter((item) => item.roles.includes(role));
  const isMoreActive = visibleMoreItems.some((item) => pathname.startsWith(item.href));

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
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors",
                active ? "text-mv-green-dark" : "text-mv-ink-faint"
              )}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-mv-green-dark" : undefined} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors",
            isMoreActive ? "text-mv-green-dark" : "text-mv-ink-faint"
          )}
        >
          <MoreHorizontal size={19} strokeWidth={isMoreActive ? 2.2 : 1.8} />
          <span>Plus</span>
        </button>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen} showSwipeHandle>
        <DrawerContent className="max-h-[75dvh]">
          <DrawerSwipeHandle className="mx-auto mt-2" />
          <DrawerHeader>
            <DrawerTitle>Plus</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-4 gap-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {visibleMoreItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-3 text-center text-[11px] font-medium transition-colors",
                    active ? "bg-mv-green/10 text-mv-green-dark" : "text-mv-ink-soft hover:bg-mv-ink/[0.04]"
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
