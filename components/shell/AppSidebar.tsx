"use client";

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
  Repeat,
  Map as MapIcon,
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
  Heart,
  UtensilsCrossed,
  PackageSearch,
  ClipboardList,
  UserCircle,
  FolderOpen,
  Zap,
  Star,
  Shield,
  TrendingUp,
  Building2,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Role } from "@/lib/types";
import { SearchDialog } from "./SearchDialog";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const SPRING = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;
// 288px (was 256) — the longer page renames this session ("Performance
// quotidienne", "Résultats fidélisation") were clipping the favorite-star
// button at the old width since the label's own truncation ellipsis kicked
// in right up against it, leaving no room for the star to show on hover.
const SIDEBAR_WIDTH = 288;

export type NavItem = {
  key: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

export const allRoles: Role[] = ["owner", "manager", "staff", "consultant"];

// 1a. LTV core — the ecosystem that gets a customer back in the door
// (menu profitability, retention/loyalty/referral). Owner/manager land here
// first; staff/consultant see it merged flat with the operational tools
// below, since they need day-to-day access to Commandes/Collaborateurs etc.
// without an extra click.
export const ltvCoreNavItems: NavItem[] = [
  { key: "overview", href: "/overview", icon: Home, roles: allRoles },
  { key: "assistant", href: "/assistant", icon: MessageSquare, roles: allRoles },
  { key: "fidelisation", href: "/fidelisation", icon: Heart, roles: allRoles },
  { key: "commandes", href: "/commandes", icon: ClipboardList, roles: allRoles },
  { key: "menu", href: "/menu", icon: UtensilsCrossed, roles: allRoles },
];

// 1b. Day-to-day operational tools — still top-level for staff/consultant,
// collapsed under "Gestion quotidienne" for owner/manager (see AppSidebar()).
export const operationalToolsItems: NavItem[] = [
  { key: "collaborateurs", href: "/collaborateurs", icon: Users, roles: allRoles },
  { key: "inventaire", href: "/inventaire", icon: PackageSearch, roles: ["owner", "manager"] },
];

const coreNavItems: NavItem[] = [...ltvCoreNavItems, ...operationalToolsItems];

// 2. Opérations & Équipe
export const operationsItems: NavItem[] = [
  { key: "horaire", href: "/horaire", icon: CalendarDays, roles: allRoles },
  { key: "fournisseurs", href: "/fournisseurs", icon: Truck, roles: ["owner", "manager"] },
  { key: "reservations", href: "/reservations", icon: CalendarClock, roles: allRoles },
  { key: "monEspace", href: "/mon-espace", icon: UserCircle, roles: allRoles },
  { key: "employees", href: "/employees", icon: Boxes, roles: ["owner", "manager"] },
];

// 3a. LTV-side analytics — surfaced prominently for owner/manager (see
// AppSidebar()), not buried inside the generic analytics dropdown below.
export const ltvAnalyticsItems: NavItem[] = [
  { key: "franchise", href: "/franchise", icon: Building2, roles: ["owner", "manager"] },
  { key: "impact", href: "/impact", icon: TrendingUp, roles: ["owner", "manager"] },
];

// 3b. Performance & Analytics — operational reporting, not LTV-specific.
export const operationalAnalyticsItems: NavItem[] = [
  { key: "days", href: "/days", icon: BarChart3, roles: allRoles },
  { key: "reports", href: "/reports", icon: FileText, roles: allRoles },
  { key: "retentionFunnel", href: "/reports/retention-funnel", icon: Repeat, roles: allRoles },
  { key: "maps", href: "/maps", icon: MapIcon, roles: allRoles },
  { key: "programs", href: "/programs", icon: GitCommit, roles: allRoles },
  { key: "library", href: "/library", icon: FolderOpen, roles: allRoles },
];

// 4. Sub settings & help items (with Intégrations inclus)
export const settingsGroupItems: NavItem[] = [
  { key: "integrations", href: "/integrations", icon: Zap, roles: allRoles },
  { key: "billing", href: "/billing", icon: CreditCard, roles: ["owner"] },
  { key: "guide", href: "/guide", icon: BookOpen, roles: allRoles },
  { key: "support", href: "/support", icon: LifeBuoy, roles: allRoles },
  { key: "changelog", href: "/changelog", icon: History, roles: allRoles },
];

const navTranslationKeys: Record<string, string> = {
  overview: "overview",
  assistant: "assistant",
  finance: "finance",
  commandes: "commandes",
  collaborateurs: "collaborateurs",
  inventaire: "inventaire",
  library: "library",
  integrations: "integrations",
  days: "days",
  reports: "reports",
  retentionFunnel: "retentionFunnel",
  menu: "menu",
  employees: "employees",
  fidelisation: "fidelisation",
  reputation: "reputation",
  maps: "maps",
  programs: "programs",
  impact: "impact",
  franchise: "franchise",
  reservations: "reservations",
  horaire: "horaire",
  monEspace: "monEspace",
  fournisseurs: "fournisseurs",
  billing: "billing",
  guide: "guide",
  designSystem: "designSystem",
  support: "support",
  changelog: "changelog",
};

export const sidebarNavCatalog = Object.entries(navTranslationKeys).map(([key, translationKey]) => ({
  key,
  translationKey,
}));

export const navDescriptions: Record<string, string> = {
  "/overview": "Vue d'ensemble et métriques clés de l'établissement",
  "/assistant": "Flow AI — copilote d'optimisation et d'analyses",
  "/fidelisation": "Programmes de fidélité, parrainages et rétention",
  "/reputation": "Gestion des avis clients et e-réputation",
  "/menu": "Gestion de la carte, marges et rentabilité des plats",
  "/finance": "Gestion financière, trésorerie et rentabilité",
  "/commandes": "Suivi des commandes et encaissements en direct",
  "/collaborateurs": "Planning de l'équipe et fiches collaborateurs",
  "/inventaire": "Gestion des stocks, ingrédients et fiches techniques",
  "/horaire": "Planning des quarts de travail et disponibilités",
  "/fournisseurs": "Gestion des fournisseurs, bons de commande et contacts",
  "/reservations": "Cahier de réservations et plan de salle",
  "/mon-espace": "Espace personnel et préférences de profil",
  "/employees": "Répertoire des employés et rôles",
  "/franchise": "Pilotage multi-établissements et groupe",
  "/impact": "Mesure d'impact et ROI des campagnes",
  "/days": "Performance quotidienne et clôtures de service",
  "/reports": "Rapports financiers, exports et comptabilité",
  "/reports/retention-funnel": "Entonnoir de rétention, cycle de vie et 10 KPI clés",
  "/maps": "Cartographie géographique de la clientèle",
  "/programs": "Historique et analyse des programmes clients",
  "/library": "Documents partagés, guides et procédures internes",
  "/integrations": "Connexions de caisse (Square, Lightspeed, Clover) et services",
  "/billing": "Facturation, abonnement et moyens de paiement",
  "/guide": "Centre d'aide et documentation opérationnelle",
  "/support": "Assistance technique et conciergerie Minerva",
  "/changelog": "Historique des nouveautés et mises à jour",
  "/etablissement": "Gestion des établissements et succursales",
  "/admin/restaurants": "Administration de la plateforme",
  "/settings": "Paramètres de l'établissement et préférences",
};

function NavLink({
  href,
  label,
  description: customDescription,
  icon: Icon,
  active,
  onNavigate,
  isFavorite,
  onToggleFavorite,
  locked,
  lockedTooltip,
}: {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  locked?: boolean;
  lockedTooltip?: string;
}) {
  const description = customDescription ?? navDescriptions[href];

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex flex-1 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-mv-green text-mv-cream-soft font-semibold shadow-sm"
          : locked
            ? "text-mv-ink-faint opacity-60 hover:bg-mv-ink/[0.04] hover:opacity-80"
            : "text-mv-ink-soft hover:bg-mv-ink/[0.06] hover:text-mv-ink"
      )}
    >
      <Icon
        size={16}
        strokeWidth={active ? 2.2 : 1.5}
        className={cn("shrink-0 transition-all duration-150", active ? "text-mv-cream-soft" : "opacity-60")}
      />
      <span className="truncate flex-1">{label}</span>
      {locked && <Lock size={12} className="shrink-0 opacity-60" />}
    </Link>
  );

  return (
    <div className="group relative flex items-center">
      <Tooltip>
        <TooltipTrigger render={link} />
        <TooltipContent side="right" className="max-w-xs text-xs font-normal">
          <span className="font-semibold">{label}</span>
          {description && <span className="opacity-90"> — {description}</span>}
          {locked && lockedTooltip && <span className="text-mv-amber"> ({lockedTooltip})</span>}
        </TooltipContent>
      </Tooltip>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={cn(
            "p-1 text-mv-ink-faint transition-opacity hover:text-mv-amber focus:outline-none",
            isFavorite ? "opacity-100 text-mv-amber" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Star size={13} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}

import { getRestaurantFaviconUrl } from "@/lib/utils/favicon";
import { MINERVA_FLOW_ATTRIBUTION } from "@/lib/branding/workspace-branding";

function TeamSwitcher() {
  const t = useTranslations("nav");
  const { restaurantId, setRestaurantId, restaurants, branding } = useApp();
  const router = useRouter();
  const current = restaurants.find((r) => r.id === restaurantId) ?? restaurants[0];
  if (!current) return null;

  const currentFavicon = branding?.logoUrl ?? getRestaurantFaviconUrl(current.website);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-mv-ink/5">
        {/* eslint-disable-next-line @next/next/no-img-element -- tenant-controlled external logo hosts are not known at build time. */}
        <img
          src={currentFavicon}
          alt={current.name}
          className="h-6 w-6 rounded-md object-contain bg-mv-cream-soft p-0.5 border border-mv-border-soft shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/icon-512.png";
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[14.5px] font-medium text-mv-ink">
            {current.name.replace("Minerva — ", "")}
          </span>
        </span>
        <ChevronDown size={14} className="shrink-0 text-mv-ink-faint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
        {restaurants.map((r) => {
          const favicon = branding?.logoUrl ?? getRestaurantFaviconUrl(r.website);
          return (
            <DropdownMenuItem
              key={r.id}
              onClick={() => setRestaurantId(r.id)}
              className="flex items-center gap-2.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tenant-controlled external logo hosts are not known at build time. */}
              <img
                src={favicon}
                alt={r.name}
                className="h-4 w-4 rounded object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/icon-512.png";
                }}
              />
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-mv-ink">{r.name}</span>
                <span className="block text-[11.5px] text-mv-ink-faint">{r.city}</span>
              </span>
              {r.id === restaurantId && <Check size={15} className="text-mv-green-dark" />}
            </DropdownMenuItem>
          );
        })}
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
  const {
    role,
    sidebarPermissions,
    isPlatformAdmin,
    sidebarCollapsed,
    setSidebarCollapsed,
    restaurantId,
    restaurants,
  } = useApp();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);

  const allowedByRole = (n: NavItem) =>
    n.roles.includes(role) && (!sidebarPermissions || sidebarPermissions.includes(n.key));

  // Flow AI is in construction — locked for everyone except platform admins,
  // who keep real access to build/test it.
  const isFlowAiLocked = (n: NavItem) => n.key === "assistant" && !isPlatformAdmin;

  // Owner/manager get a condensed, LTV-first core list (Overview, Flow AI,
  // Menu, Fidélisation) with the operational tools one click away in
  // "Gestion quotidienne" — staff/consultant, who need those tools daily,
  // keep the flat combined list unchanged.
  const isLtvFocusedRole = role === "owner" || role === "manager";
  const visibleCoreItems = (isLtvFocusedRole ? ltvCoreNavItems : coreNavItems).filter(allowedByRole);
  // Owner/manager see Impact LTV / Vue franchise as their own small block
  // (not buried inside the generic analytics dropdown alongside non-LTV
  // reporting) — the rest of "Performance & Analyse" stays collapsed by
  // default instead of forced open, same "hidden, not removed" treatment
  // as every other non-LTV group. Staff/consultant never see impact/
  // franchise (role-gated to owner/manager already) so their flat
  // analytics list is unaffected either way.
  // "Vue franchise" leads to a permanently empty page for an account with
  // only one restaurant (it can never have a second location to roll up
  // against) — hidden rather than shown-then-disappointing, same "don't
  // show a dead end" principle as the rest of this role-conditional nav.
  // Every signup gets wrapped in its own workspace now (see
  // 0024_customer_self_enrollment.sql), so a bare workspace_id check would
  // show this for every solo owner too — restaurant COUNT is what actually
  // determines whether Franchise has anything to roll up.
  const hasMultipleRestaurants = restaurants.length > 1;
  const visibleLtvAnalyticsItems = isLtvFocusedRole
    ? ltvAnalyticsItems.filter(allowedByRole).filter((item) => item.key !== "franchise" || hasMultipleRestaurants)
    : [];
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
          className="flex h-full w-72 min-w-72 flex-col"
          animate={
            isMobile
              ? { x: 0, opacity: 1 }
              : { x: sidebarCollapsed ? -48 : 0, opacity: sidebarCollapsed ? 0 : 1 }
          }
          transition={SPRING}
        >
          {/* Header block with Logo switcher and search icon */}
          <div className="flex h-16 items-center justify-between border-b border-mv-border px-3">
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

          <div className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
            {/* Core General List — for owner/manager, Vue franchise / Impact
                are interleaved right after Flow AI (before Fidélisation /
                Menu), not tacked on as a separate block. Staff/consultant
                render visibleCoreItems flat and unchanged (their list never
                contains franchise/impact — role-gated to owner/manager). */}
            <div className="space-y-0.5">
            {isLtvFocusedRole ? (
              <>
                {visibleCoreItems.slice(0, 2).map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={t(navTranslationKeys[item.key] || item.key)}
                    icon={item.icon}
                    active={pathname.startsWith(item.href)}
                    onNavigate={closeMobile}
                    locked={isFlowAiLocked(item)}
                    lockedTooltip="Bientôt disponible"
                  />
                ))}
                {visibleLtvAnalyticsItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={t(navTranslationKeys[item.key] || item.key)}
                    icon={item.icon}
                    active={pathname.startsWith(item.href)}
                    onNavigate={closeMobile}
                  />
                ))}
                {visibleCoreItems.slice(2).map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={t(navTranslationKeys[item.key] || item.key)}
                    icon={item.icon}
                    active={pathname.startsWith(item.href)}
                    onNavigate={closeMobile}
                  />
                ))}
              </>
            ) : (
              visibleCoreItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={t(navTranslationKeys[item.key] || item.key)}
                  icon={item.icon}
                  active={pathname.startsWith(item.href)}
                  onNavigate={closeMobile}
                  locked={isFlowAiLocked(item)}
                  lockedTooltip="Bientôt disponible"
                />
              ))
            )}
            </div>
          </div>

          {/* Settings Section at the bottom */}
          <div className="border-t border-mv-border p-2.5 space-y-1">
            <NavLink
              href="/integrations"
              label={t("integrations")}
              icon={Zap}
              active={pathname.startsWith("/integrations")}
              onNavigate={closeMobile}
            />

            {isPlatformAdmin && (
              <NavLink
                href="/admin/restaurants"
                label={t("admin")}
                icon={Shield}
                active={pathname.startsWith("/admin")}
                onNavigate={closeMobile}
              />
            )}

            {hasSettingsAccess && (
              <NavLink
                href="/settings"
                label={t("settings")}
                icon={Settings}
                active={pathname.startsWith("/settings")}
                onNavigate={closeMobile}
              />
            )}

            <div className="pt-1">
              <LocaleSwitcher />
            </div>
            <p className="px-2.5 pt-1 text-center text-[10px] font-medium tracking-wide text-mv-ink-faint">
              {MINERVA_FLOW_ATTRIBUTION}
            </p>
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
