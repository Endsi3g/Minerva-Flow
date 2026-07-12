"use client";

import { LogoMark } from "./Logo";
import { useApp } from "@/lib/app-context";
import { restaurants } from "@/lib/mock-data";
import { reports, reportGroups } from "@/lib/reports";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  Check,
  Database,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";

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

function TeamSwitcher() {
  const { restaurantId, setRestaurantId } = useApp();
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

export function AppSidebar() {
  const pathname = usePathname();
  const { role, restaurantId, setRestaurantId } = useApp();
  const items = nav.filter((n) => n.roles.includes(role));
  const [openGroup, setOpenGroup] = useState<string | null>("Revenue");

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      className={cn(
                        active && "bg-mv-green text-mv-cream-soft hover:bg-mv-green hover:text-mv-cream-soft"
                      )}
                    >
                      <Icon size={16} strokeWidth={2.2} className={active ? "text-mv-lime" : ""} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Restaurants</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {restaurants.map((r) => (
                <SidebarMenuItem key={r.id}>
                  <SidebarMenuButton
                    onClick={() => setRestaurantId(r.id)}
                    isActive={r.id === restaurantId}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-bold text-white"
                      style={{ background: r.color }}
                    >
                      {r.city[0]}
                    </span>
                    <span>{r.city}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Metrics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportGroups.map((group) => {
                const groupReports = reports.filter((r) => r.group === group);
                const isOpen = openGroup === group;
                return (
                  <Collapsible
                    key={group}
                    open={isOpen}
                    onOpenChange={(v) => setOpenGroup(v ? group : null)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger
                        render={
                          <SidebarMenuButton>
                            <ChevronDown
                              size={14}
                              className={cn("transition-transform", !isOpen && "-rotate-90")}
                            />
                            <span>{group}</span>
                          </SidebarMenuButton>
                        }
                      />
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {groupReports.map((r) => (
                            <SidebarMenuSubItem key={r.slug}>
                              <SidebarMenuSubButton
                                render={<Link href={`/reports/${r.slug}`} />}
                                isActive={pathname === `/reports/${r.slug}`}
                              >
                                <span>{r.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {role === "owner" && (
          <>
            <SidebarSeparator />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/settings" />}
                  isActive={pathname.startsWith("/settings")}
                  className={cn(
                    pathname.startsWith("/settings") &&
                      "bg-mv-green text-mv-cream-soft hover:bg-mv-green hover:text-mv-cream-soft"
                  )}
                >
                  <Settings
                    size={16}
                    strokeWidth={2.2}
                    className={pathname.startsWith("/settings") ? "text-mv-lime" : ""}
                  />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}

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
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
