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
  Settings2,
  Map as MapIcon,
  Sparkles,
  Users,
  Users2,
  BookOpen,
  LifeBuoy,
  CreditCard,
  History,
  ChevronDown,
  Check,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

// Toujours visibles, hors groupe : les deux pages les plus consultées au quotidien.
const pinnedNav: NavItem[] = [
  { href: "/overview", label: "Aperçu", icon: LayoutGrid, roles: ["owner", "staff", "consultant"] },
  { href: "/assistant", label: "Assistant", icon: Sparkles, roles: ["owner", "manager", "staff", "consultant"] },
];

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: "operations",
    label: "Opérations",
    items: [
      { href: "/days", label: "Journées", icon: CalendarDays, roles: ["owner", "staff"] },
      { href: "/programs", label: "Programmes", icon: LineChart, roles: ["owner", "consultant"] },
    ],
  },
  {
    id: "croissance",
    label: "Croissance",
    items: [
      { href: "/campaigns", label: "Campagnes", icon: Megaphone, roles: ["owner", "consultant"] },
      { href: "/maps", label: "Cartes", icon: MapIcon, roles: ["owner", "staff", "consultant"] },
    ],
  },
  {
    id: "equipe",
    label: "Équipe",
    items: [
      { href: "/collaborateurs", label: "Collaborateurs", icon: Users, roles: ["owner", "manager"] },
      { href: "/employees", label: "Employés", icon: Users2, roles: ["owner", "manager"] },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [{ href: "/finance", label: "Finance", icon: Wallet, roles: ["owner"] }],
  },
];

const allRoles: Role[] = ["owner", "manager", "staff", "consultant"];

const settingsGroup: NavGroup = {
  id: "parametres",
  label: "Paramètres",
  items: [
    { href: "/settings", label: "Paramètres", icon: Settings, roles: ["owner"] },
    { href: "/billing", label: "Facturation", icon: CreditCard, roles: ["owner"] },
    { href: "/guide", label: "Guide", icon: BookOpen, roles: allRoles },
    { href: "/support", label: "Aide & Support", icon: LifeBuoy, roles: allRoles },
    { href: "/changelog", label: "Nouveautés", icon: History, roles: allRoles },
  ],
};

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
        className={cn("shrink-0 transition-all duration-150", active ? "text-mv-cream-soft" : "opacity-60")}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function TeamSwitcher() {
  const { restaurantId, setRestaurantId, restaurants } = useApp();
  const router = useRouter();
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
        <div className="my-1 border-t border-mv-border-soft" />
        <DropdownMenuItem
          onClick={() => router.push("/workspace")}
          className="flex items-center gap-2.5 text-mv-ink-soft"
        >
          <Settings2 size={15} className="shrink-0" />
          <span className="text-[13px] font-semibold">Gérer le workspace</span>
        </DropdownMenuItem>
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
  const { role, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const isMobile = useIsMobile();
  const pinnedItems = pinnedNav.filter((n) => n.roles.includes(role));
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((n) => n.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
  const visibleSettingsGroup = {
    ...settingsGroup,
    items: settingsGroup.items.filter((n) => n.roles.includes(role)),
  };

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
              {pinnedItems.map((item) => (
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

            {visibleGroups.map((group) => {
              const hasActiveChild = group.items.some((item) => pathname.startsWith(item.href));
              const isCollapsed = hasActiveChild ? false : (collapsedGroups[group.id] ?? false);
              return (
                <CollapsibleSection
                  key={group.id}
                  label={group.label}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleGroup(group.id)}
                >
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={pathname.startsWith(item.href)}
                      onNavigate={closeMobile}
                    />
                  ))}
                </CollapsibleSection>
              );
            })}

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

          {visibleSettingsGroup.items.length > 0 && (
            <div className="border-t border-mv-border p-2.5">
              <CollapsibleSection
                label={visibleSettingsGroup.label}
                isCollapsed={
                  visibleSettingsGroup.items.some((item) => pathname.startsWith(item.href))
                    ? false
                    : (collapsedGroups[visibleSettingsGroup.id] ?? false)
                }
                onToggle={() => toggleGroup(visibleSettingsGroup.id)}
              >
                {visibleSettingsGroup.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={pathname.startsWith(item.href)}
                    onNavigate={closeMobile}
                  />
                ))}
              </CollapsibleSection>
            </div>
          )}
        </motion.div>
      </motion.aside>
    </>
  );
}
