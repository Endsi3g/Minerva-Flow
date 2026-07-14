"use client";

import { cn } from "@/lib/utils";
import { LayoutGrid, Sparkles, Database, FileBarChart2, Users, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-context";
import type { LucideIcon } from "lucide-react";

type TabItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Fixed 5-tab bottom navigation shown only on mobile (<768px), replacing the
 * desktop sidebar. Rendered by both app/(app)/layout.tsx (via AppShell) and
 * app/(chat)/layout.tsx so it stays available even inside the AI chat.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { role } = useApp();

  const tabs: TabItem[] = [
    { href: "/overview", label: "Accueil", icon: LayoutGrid },
    { href: "/assistant", label: "Chat IA", icon: Sparkles },
    { href: "/data", label: "Données", icon: Database },
    { href: "/reports", label: "Rapports", icon: FileBarChart2 },
  ];

  if (role === "owner" || role === "manager") {
    tabs.push({ href: "/collaborateurs", label: "Collaborateurs", icon: Users });
  } else {
    tabs.push({ href: "/profil", label: "Profil", icon: User });
  }

  return (
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
    </nav>
  );
}
