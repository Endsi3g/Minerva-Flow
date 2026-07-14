"use client";

import { LogoMark } from "./Logo";
import { useApp } from "@/lib/app-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { reportDefs, reportGroups } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutGrid,
  LineChart,
  CalendarDays,
  Wallet,
  Megaphone,
  Settings,
  Map as MapIcon,
  Sparkles,
  Users,
  ChevronDown,
  Check,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";

const SPRING = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;
const SIDEBAR_WIDTH = 256;

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

const nav: NavItem[] = [
  { href: "/overview", label: "Aperçu", icon: LayoutGrid, roles: ["owner", "staff", "consultant"] },
  { href: "/programs", label: "Programmes", icon: LineChart, roles: ["owner", "consultant"] },
  { href: "/days", label: "Journées", icon: CalendarDays, roles: ["owner", "staff"] },
  { href: "/finance", label: "Finance", icon: Wallet, roles: ["owner"] },
  { href: "/campaigns", label: "Campagnes", icon: Megaphone, roles: ["owner", "consultant"] },
  { href: "/collaborateurs", label: "Collaborateurs", icon: Users, roles: ["owner", "manager"] },
  { href: "/maps", label: "Cartes", icon: MapIcon, roles: ["owner", "staff", "consultant"] },
  { href: "/assistant", label: "Assistant", icon: Sparkles, roles: ["owner", "manager", "staff", "consultant"] },
];

const groupLabels: Record<string, string> = {
  Revenue: "Revenu",
  Service: "Service",
  Finance: "Finance",
  Campagnes: "Campagnes",
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-mv-green text-mv-cream-soft font-semibold"
          : "text-mv-ink-soft hover:bg-mv-ink/[0.06] hover:text-mv-ink"
      )}
    >
      <Icon
        size={16}
        strokeWidth={active ? 2.2 : 1.5}
        className={cn("shrink-0 transition-all duration-150", active ? "text-mv-lime" : "opacity-60")}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function TeamSwitcher() {
  const { restaurantId, setRestaurantId, restaurants } = useApp();
  const current = restaurants.find((r) => r.id === restaurantId) ?? restaurants[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-mv-ink/5">
        <LogoMark size={24} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[14.5px] font-medium text-mv-ink">
            {current.name.replace("Minerva — ", "")}
          </span>
        </span>
        <ChevronDown size={14} className="shrink-0 text-mv-ink-faint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {restaurants.map((r) => (
          <DropdownMenuItem
            key={r.id}
            onClick={() => setRestaurantId(r.id)}
            className="flex items-center gap-2.5"
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-mv-ink">{r.name}</span>
              <span className="block text-[11.5px] text-mv-ink-faint">{r.city}</span>
            </span>
            {r.id === restaurantId && <Check size={15} className="text-mv-green-dark" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CollapsibleSection({
  label,
  isCollapsed,
  onToggle,
  children,
}: {
  label: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mv-ink-faint transition-colors hover:text-mv-ink"
      >
        <span>{label}</span>
        <ChevronDown
          size={12}
          className={cn("transition-transform duration-200", isCollapsed && "-rotate-90")}
        />
      </button>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 py-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { role, restaurantId, setRestaurantId, restaurants, sidebarCollapsed, setSidebarCollapsed } =
    useApp();
  const isMobile = useIsMobile();
  const items = nav.filter((n) => n.roles.includes(role));

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function closeMobile() {
    if (isMobile) setSidebarCollapsed(true);
  }

  return (
    <>
      {isMobile && !sidebarCollapsed && (
        <div
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <motion.aside
        animate={
          isMobile
            ? { x: sidebarCollapsed ? -SIDEBAR_WIDTH : 0, width: SIDEBAR_WIDTH }
            : { width: sidebarCollapsed ? 0 : SIDEBAR_WIDTH, x: 0 }
        }
        initial={false}
        transition={SPRING}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col overflow-hidden border-r border-mv-border bg-mv-cream-soft md:static md:relative",
          sidebarCollapsed && "md:border-r-0"
        )}
        style={{ minWidth: 0 }}
      >
        <motion.div
          className="flex h-full w-64 min-w-64 flex-col"
          animate={
            isMobile
              ? { x: 0, opacity: 1 }
              : { x: sidebarCollapsed ? -48 : 0, opacity: sidebarCollapsed ? 0 : 1 }
          }
          transition={SPRING}
        >
          <div className="flex h-12 items-center border-b border-mv-border px-3">
            <TeamSwitcher />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={pathname.startsWith(item.href)}
                  onNavigate={closeMobile}
                />
              ))}
            </div>

            <CollapsibleSection
              label="Restaurants"
              isCollapsed={collapsedGroups["restaurants"] ?? false}
              onToggle={() => toggleGroup("restaurants")}
            >
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRestaurantId(r.id);
                    closeMobile();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors",
                    r.id === restaurantId
                      ? "bg-mv-ink/[0.06] text-mv-ink"
                      : "text-mv-ink-soft hover:bg-mv-ink/[0.06] hover:text-mv-ink"
                  )}
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-bold text-white"
                    style={{ background: r.color }}
                  >
                    {r.city[0]}
                  </span>
                  <span className="truncate">{r.city}</span>
                </button>
              ))}
            </CollapsibleSection>

            <div className="space-y-2">
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-mv-ink-faint">
                Métriques
              </p>
              {reportGroups.map((group) => {
                const groupReports = reportDefs.filter((r) => r.group === group);
                const hasActiveChild = groupReports.some(
                  (r) => pathname === `/reports/${r.slug}`
                );
                const isCollapsed = hasActiveChild
                  ? false
                  : (collapsedGroups[group] ?? true);
                return (
                  <CollapsibleSection
                    key={group}
                    label={groupLabels[group] ?? group}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleGroup(group)}
                  >
                    {groupReports.map((r) => {
                      const active = pathname === `/reports/${r.slug}`;
                      return (
                        <Link
                          key={r.slug}
                          href={`/reports/${r.slug}`}
                          onClick={closeMobile}
                          className={cn(
                            "block truncate rounded-md py-1.5 pl-6 pr-2.5 text-[12.5px] font-medium transition-colors",
                            active
                              ? "bg-mv-green-tint text-mv-green-dark font-semibold"
                              : "text-mv-ink-faint hover:bg-mv-ink/[0.06] hover:text-mv-ink"
                          )}
                        >
                          {r.label}
                        </Link>
                      );
                    })}
                  </CollapsibleSection>
                );
              })}
            </div>
          </div>

          {role === "owner" && (
            <div className="border-t border-mv-border p-2.5">
              <NavLink
                href="/settings"
                label="Paramètres"
                icon={Settings}
                active={pathname.startsWith("/settings")}
                onNavigate={closeMobile}
              />
            </div>
          )}
        </motion.div>
      </motion.aside>
    </>
  );
}
