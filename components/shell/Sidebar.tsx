"use client";

import { LogoMark } from "./Logo";
import { useApp, roleLabels } from "@/lib/app-context";
import { restaurants } from "@/lib/mock-data";
import { reports, reportGroups } from "@/lib/reports";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutGrid,
  LineChart,
  CalendarDays,
  Wallet,
  Megaphone,
  Settings,
  Map as MapIcon,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Check,
  Database,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

const nav: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutGrid, roles: ["owner", "staff", "consultant"] },
  { href: "/programs", label: "Programs", icon: LineChart, roles: ["owner", "consultant"] },
  { href: "/days", label: "Days", icon: CalendarDays, roles: ["owner", "staff"] },
  { href: "/finance", label: "Finance", icon: Wallet, roles: ["owner"] },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, roles: ["owner", "consultant"] },
  { href: "/maps", label: "Maps", icon: MapIcon, roles: ["owner", "staff", "consultant"] },
];

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

function WorkspaceSwitcher() {
  const { restaurantId, setRestaurantId } = useApp();
  const current = restaurants.find((r) => r.id === restaurantId) ?? restaurants[0];
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-mv-ink/5"
      >
        <LogoMark size={24} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[14.5px] font-medium text-mv-ink">
            {current.name.replace("Minerva — ", "")}
          </span>
        </span>
        <ChevronDown size={14} className="shrink-0 text-mv-ink-faint" />
      </button>
      {open && (
        <div className="mv-animate-in absolute left-0 top-11 z-40 w-64 rounded-xl border border-mv-border bg-mv-surface p-1.5 shadow-mv-lg">
          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRestaurantId(r.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-mv-cream-soft"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-mv-ink">{r.name}</span>
                <span className="block text-[11.5px] text-mv-ink-faint">{r.city}</span>
              </span>
              {r.id === restaurantId && <Check size={15} className="text-mv-green-dark" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { role, sidebarCollapsed, setSidebarCollapsed, restaurantId } = useApp();
  const items = nav.filter((n) => n.roles.includes(role));
  const [openGroup, setOpenGroup] = useState<string | null>("Revenue");

  if (sidebarCollapsed) {
    return (
      <aside className="flex h-full w-11 shrink-0 flex-col items-center border-r border-mv-border bg-mv-cream-soft py-4">
        <button
          onClick={() => setSidebarCollapsed(false)}
          aria-label="Déplier la navigation"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
        >
          <ChevronsRight size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-mv-border bg-mv-cream-soft">
      <div className="flex h-16 items-center gap-1 border-b border-mv-border px-3">
        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher />
        </div>
        <button
          aria-label="Rechercher"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-ink"
        >
          <Search size={15} />
        </button>
        <button
          onClick={() => setSidebarCollapsed(true)}
          aria-label="Réduire la navigation"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-ink"
        >
          <ChevronsLeft size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-0.5">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-semibold transition-colors",
                  active
                    ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
                    : "text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink"
                )}
              >
                <Icon
                  size={16}
                  strokeWidth={2.2}
                  className={active ? "text-mv-lime" : "text-mv-ink-faint group-hover:text-mv-ink-soft"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <p className="mb-1.5 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Restaurants
        </p>
        <nav className="space-y-0.5">
          {restaurants.map((r) => (
            <button
              key={r.id}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-[13px] font-medium transition-colors",
                r.id === restaurantId
                  ? "bg-mv-ink/5 text-mv-ink"
                  : "text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink"
              )}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold text-white"
                style={{ background: r.color }}
              >
                {r.city[0]}
              </span>
              <span className="truncate">{r.city}</span>
            </button>
          ))}
        </nav>

        <p className="mb-1.5 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
          Metrics
        </p>
        <nav className="space-y-0.5">
          {reportGroups.map((group) => {
            const groupReports = reports.filter((r) => r.group === group);
            const isOpen = openGroup === group;
            return (
              <Collapsible
                key={group}
                open={isOpen}
                onOpenChange={(v) => setOpenGroup(v ? group : null)}
              >
                <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-left text-[13px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink">
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  {group}
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-4 space-y-0.5 border-l border-mv-border-soft pl-3">
                  {groupReports.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/reports/${r.slug}`}
                      className={cn(
                        "block truncate rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                        pathname === `/reports/${r.slug}`
                          ? "bg-mv-green-tint text-mv-green-dark"
                          : "text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-ink"
                      )}
                    >
                      {r.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </div>

      {role === "owner" && (
        <div className="border-t border-mv-border p-3">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-semibold transition-colors",
              pathname.startsWith("/settings")
                ? "bg-mv-green text-mv-cream-soft shadow-mv-sm"
                : "text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink"
            )}
          >
            <Settings
              size={16}
              strokeWidth={2.2}
              className={pathname.startsWith("/settings") ? "text-mv-lime" : "text-mv-ink-faint"}
            />
            Settings
          </Link>
        </div>
      )}

      <div className="border-t border-mv-border p-3">
        <div className="rounded-xl bg-mv-green-tint p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <Database size={14} className="text-mv-green-dark" />
            <p className="font-display text-[13px] font-medium text-mv-green-darker">
              Données de démonstration
            </p>
          </div>
          <p className="mb-3 text-[12px] leading-relaxed text-mv-green-dark/80">
            Connectez Supabase pour brancher vos vraies données de revenus.
          </p>
          <Link
            href="/settings"
            className="flex h-8 w-full items-center justify-center rounded-lg bg-mv-green-darker text-[12.5px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-green-dark"
          >
            Continuer la configuration
          </Link>
        </div>
      </div>
    </aside>
  );
}
