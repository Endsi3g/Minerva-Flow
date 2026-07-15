"use client";

import { LogoMark } from "./Logo";
import { useApp } from "@/lib/app-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Check,
  Home,
  MessageSquare,
  GitCommit,
  BarChart3,
  Boxes,
  FileText,
  Map as MapIcon,
  Send as SendIcon,
  Compass as CompassIcon,
  Search as SearchIcon,
  Settings,
  CreditCard,
  BookOpen,
  LifeBuoy,
  History,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";
import { SearchDialog } from "./SearchDialog";

const SPRING = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;
const SIDEBAR_WIDTH = 256;

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

const allRoles: Role[] = ["owner", "manager", "staff", "consultant"];

// Main navigation items flat list
const mainNavItems: NavItem[] = [
  { href: "/overview", label: "Aperçu", icon: Home, roles: ["owner", "staff", "consultant"] },
  { href: "/assistant", label: "Assistant", icon: MessageSquare, roles: ["owner", "manager", "staff", "consultant"] },
  { href: "/programs", label: "Programmes", icon: GitCommit, roles: ["owner", "consultant"] },
  { href: "/days", label: "Journées", icon: BarChart3, roles: ["owner", "staff"] },
  { href: "/employees", label: "Employés", icon: Boxes, roles: ["owner", "manager"] },
  { href: "/reports", label: "Rapports", icon: FileText, roles: allRoles },
  { href: "/maps", label: "Cartes", icon: MapIcon, roles: ["owner", "staff", "consultant"] },
];

// Favorites section
const favorites = [
  { href: "/reports/revenu", label: "Revenu total", icon: MapIcon, color: "#9F7AEA", roles: allRoles },
  { href: "/campaigns", label: "Campagnes", icon: SendIcon, color: "#48BB78", roles: ["owner", "consultant"] },
  { href: "/finance", label: "Finance", icon: CompassIcon, color: "#3182CE", roles: ["owner"] },
  { href: "/collaborateurs", label: "Collaborateurs", icon: Users, color: "#718096", roles: ["owner", "manager"] },
];

const settingsGroupItems: NavItem[] = [
  { href: "/settings", label: "Paramètres", icon: Settings, roles: ["owner"] },
  { href: "/billing", label: "Facturation", icon: CreditCard, roles: ["owner"] },
  { href: "/guide", label: "Guide", icon: BookOpen, roles: allRoles },
  { href: "/support", label: "Aide & Support", icon: LifeBuoy, roles: allRoles },
  { href: "/changelog", label: "Nouveautés", icon: History, roles: allRoles },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  iconColor,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
  iconColor?: string;
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
        style={{ color: active ? "currentColor" : iconColor }}
        className={cn("shrink-0 transition-all duration-150", active ? "text-mv-cream-soft" : !iconColor && "opacity-60")}
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

export function AppSidebar() {
  const pathname = usePathname();
  const { role, sidebarCollapsed, setSidebarCollapsed, restaurantId } = useApp();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);

  const visibleMainItems = mainNavItems.filter((n) => n.roles.includes(role));
  const visibleFavorites = favorites.filter((n) => n.roles.includes(role));
  const visibleSettingsItems = settingsGroupItems.filter((n) => n.roles.includes(role));

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
          {/* Header block with Logo switcher and search icon */}
          <div className="flex h-12 items-center justify-between border-b border-mv-border px-3">
            <div className="flex-1 min-w-0">
              <TeamSwitcher />
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Recherche"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink ml-1"
            >
              <SearchIcon size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-2.5 py-3">
            {/* Main Navigation List */}
            <div className="space-y-0.5">
              {visibleMainItems.map((item) => (
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

            {/* Favorites Section */}
            {visibleFavorites.length > 0 && (
              <div className="space-y-1">
                <p className="px-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                  Raccourcis
                </p>
                <div className="space-y-0.5">
                  {visibleFavorites.map((item) => (
                    <NavLink
                      key={item.label}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={pathname.startsWith(item.href)}
                      onNavigate={closeMobile}
                      iconColor={item.color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings Section Flat List at the bottom */}
          {visibleSettingsItems.length > 0 && (
            <div className="border-t border-mv-border p-2.5 space-y-0.5">
              <p className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                Paramètres
              </p>
              {visibleSettingsItems.map((item) => (
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
          )}
        </motion.div>
      </motion.aside>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        restaurantId={restaurantId}
      />
    </>
  );
}
