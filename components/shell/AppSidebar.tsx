"use client";

import { LogoMark } from "./Logo";
import { useApp } from "@/lib/app-context";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Search as SearchIcon,
  Settings,
  CreditCard,
  BookOpen,
  LifeBuoy,
  History,
  Settings2,
  Users,
  CalendarClock,
  CalendarDays,
  Truck,
  Wallet,
  TrendingDown,
  Database,
  Heart,
  UtensilsCrossed,
  PackageSearch,
  ClipboardList,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Role } from "@/lib/types";
import { SearchDialog } from "./SearchDialog";
import { LocaleSwitcher } from "./LocaleSwitcher";

const SPRING = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;
const SIDEBAR_WIDTH = 256;

type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

const allRoles: Role[] = ["owner", "manager", "staff", "consultant"];

// Main navigation items flat list (Overview, Flow AI, Programmes, Journées, Employés, Rapports, Cartes)
const mainNavItems: NavItem[] = [
  { key: "overview", href: "/overview", icon: Home, roles: allRoles },
  { key: "assistant", href: "/assistant", icon: MessageSquare, roles: allRoles },
  { key: "finance", href: "/finance", icon: Wallet, roles: ["owner", "manager"] },
  { key: "days", href: "/days", icon: BarChart3, roles: allRoles },
  { key: "reports", href: "/reports", icon: FileText, roles: allRoles },
  { key: "menu", href: "/menu", icon: UtensilsCrossed, roles: allRoles },
  { key: "employees", href: "/employees", icon: Boxes, roles: ["owner", "manager"] },
  { key: "fidelisation", href: "/fidelisation", icon: Heart, roles: allRoles },
  { key: "maps", href: "/maps", icon: MapIcon, roles: allRoles },
  { key: "programs", href: "/programs", icon: GitCommit, roles: allRoles },
];

// Favorites section
const favorites: (NavItem & { color: string; translationKey: string })[] = [
  { key: "fav_maps", translationKey: "favMaps", href: "/maps", icon: MapIcon, color: "#9F7AEA", roles: allRoles },
  { key: "fav_campaigns_email", translationKey: "favCampaignsEmail", href: "/campaigns?channel=Email", icon: SendIcon, color: "#48BB78", roles: ["owner", "consultant"] },
  { key: "fav_depenses", translationKey: "favDepenses", href: "/depenses", icon: TrendingDown, color: "#B5473A", roles: ["owner", "manager"] },
  { key: "fav_data", translationKey: "favData", href: "/data", icon: Database, color: "#DD6B20", roles: ["owner", "manager", "consultant"] },
  { key: "fav_collaborateurs", translationKey: "favCollaborateurs", href: "/collaborateurs", icon: Users, color: "#718096", roles: ["owner", "manager"] },
];

// Opérations — expansion "OS pour restaurants" (réservations, puis horaire,
// puis fournisseurs au fur et à mesure qu'ils sont construits).
const operationsItems: NavItem[] = [
  { key: "reservations", href: "/reservations", icon: CalendarClock, roles: allRoles },
  { key: "horaire", href: "/horaire", icon: CalendarDays, roles: allRoles },
  { key: "monEspace", href: "/mon-espace", icon: UserCircle, roles: allRoles },
  { key: "fournisseurs", href: "/fournisseurs", icon: Truck, roles: ["owner", "manager"] },
  { key: "inventaire", href: "/inventaire", icon: PackageSearch, roles: ["owner", "manager"] },
  { key: "commandes", href: "/commandes", icon: ClipboardList, roles: allRoles },
];

// Sub settings items (without Paramètres/Settings which is standalone)
const subSettingsGroupItems: NavItem[] = [
  { key: "billing", href: "/billing", icon: CreditCard, roles: ["owner"] },
  { key: "guide", href: "/guide", icon: BookOpen, roles: allRoles },
  { key: "support", href: "/support", icon: LifeBuoy, roles: allRoles },
  { key: "changelog", href: "/changelog", icon: History, roles: allRoles },
];

const navTranslationKeys: Record<string, string> = {
  overview: "overview",
  assistant: "assistant",
  finance: "finance",
  days: "days",
  reports: "reports",
  menu: "menu",
  employees: "employees",
  fidelisation: "fidelisation",
  maps: "maps",
  programs: "programs",
  reservations: "reservations",
  horaire: "horaire",
  monEspace: "monEspace",
  fournisseurs: "fournisseurs",
  inventaire: "inventaire",
  commandes: "commandes",
  billing: "billing",
  guide: "guide",
  support: "support",
  changelog: "changelog",
  fav_maps: "favMaps",
  fav_campaigns_email: "favCampaignsEmail",
  fav_depenses: "favDepenses",
  fav_data: "favData",
  fav_collaborateurs: "favCollaborateurs",
};

/** All customizable nav item keys, for the per-member sidebar permission editor. */
export const sidebarNavCatalog: { key: string; translationKey: string }[] = Object.entries(
  navTranslationKeys
).map(([key, translationKey]) => ({ key, translationKey }));

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

function CollapsibleSection({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-2.5 py-1 text-left text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint transition-colors hover:text-mv-ink focus:outline-none"
      >
        <span>{label}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown size={12} className="opacity-60" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 40 }}
            className="overflow-hidden space-y-0.5 pl-2 border-l border-mv-border/40 ml-2.5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamSwitcher() {
  const t = useTranslations("nav");
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
      <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
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
          <span className="text-[13px] font-semibold">{t("manageWorkspace")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { role, sidebarPermissions, sidebarCollapsed, setSidebarCollapsed, restaurantId, setRestaurantId, restaurants } =
    useApp();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);

  const allowedByRole = (n: NavItem) =>
    n.roles.includes(role) && (!sidebarPermissions || sidebarPermissions.includes(n.key));

  const visibleMainItems = mainNavItems.filter(allowedByRole);
  const visibleFavorites = favorites.filter(allowedByRole);
  const visibleOperationsItems = operationsItems.filter(allowedByRole);
  const visibleSettingsItems = subSettingsGroupItems.filter(allowedByRole);
  const hasSettingsAccess = ["owner", "manager"].includes(role);

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
              aria-label={t("searchAria")}
              title={t("searchTitle")}
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
                  label={t(navTranslationKeys[item.key])}
                  icon={item.icon}
                  active={pathname.startsWith(item.href)}
                  onNavigate={closeMobile}
                />
              ))}
            </div>

            {/* Opérations Section */}
            {visibleOperationsItems.length > 0 && (
              <CollapsibleSection
                label={t("sectionOperations")}
                defaultOpen={visibleOperationsItems.some((item) => pathname.startsWith(item.href))}
              >
                {visibleOperationsItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={t(navTranslationKeys[item.key])}
                    icon={item.icon}
                    active={pathname.startsWith(item.href)}
                    onNavigate={closeMobile}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Teams / Restaurants Section */}
            <div className="space-y-1">
              <p className="px-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint">
                {t("sectionTeams")}
              </p>
              <div className="space-y-0.5">
                {restaurants.map((r) => {
                  const isCurrent = r.id === restaurantId;
                  const letter = r.name.replace("Minerva — ", "").charAt(0).toUpperCase();
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setRestaurantId(r.id);
                        closeMobile();
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-all duration-150",
                        isCurrent
                          ? "bg-mv-green/10 text-mv-green-dark font-semibold"
                          : "text-mv-ink-soft hover:bg-mv-ink/[0.06] hover:text-mv-ink"
                      )}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white transition-all"
                        style={{ backgroundColor: r.color || "#6341F0" }}
                      >
                        {letter}
                      </span>
                      <span className="truncate">{r.name.replace("Minerva — ", "")}</span>
                    </button>
                  );
                })}
                <NavLink
                  href="/etablissement"
                  label={t("allTeams")}
                  icon={LayoutGrid}
                  active={pathname.startsWith("/etablissement")}
                  onNavigate={closeMobile}
                />
              </div>
            </div>

            {/* Favorites Section */}
            {visibleFavorites.length > 0 && (
              <CollapsibleSection
                label={t("sectionFavorites")}
                defaultOpen={visibleFavorites.some((item) => pathname.startsWith(item.href))}
              >
                {visibleFavorites.map((item) => (
                  <NavLink
                    key={item.key}
                    href={item.href}
                    label={t(navTranslationKeys[item.key])}
                    icon={item.icon}
                    active={pathname.startsWith(item.href)}
                    onNavigate={closeMobile}
                    iconColor={item.color}
                  />
                ))}
              </CollapsibleSection>
            )}
          </div>

          {/* Settings Section Flat/Collapsible List at the bottom */}
          <div className="border-t border-mv-border p-2.5 space-y-1.5">
            {/* Collapsible Paramètres et plus */}
            {visibleSettingsItems.length > 0 && (
              <CollapsibleSection
                label={t("sectionSettingsMore")}
                defaultOpen={visibleSettingsItems.some((item) => pathname.startsWith(item.href))}
              >
                {visibleSettingsItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={t(navTranslationKeys[item.key])}
                    icon={item.icon}
                    active={pathname.startsWith(item.href)}
                    onNavigate={closeMobile}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Standalone settings item */}
            {hasSettingsAccess && (
              <NavLink
                href="/settings"
                label={t("settings")}
                icon={Settings}
                active={pathname.startsWith("/settings")}
                onNavigate={closeMobile}
              />
            )}

            <LocaleSwitcher />
          </div>
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
