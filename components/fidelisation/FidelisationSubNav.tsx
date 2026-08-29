"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { Users, Share2, Gift, QrCode, Settings } from "lucide-react";

const SECTIONS = [
  { href: "/fidelisation", label: "Clients", icon: Users, managerOnly: false },
  { href: "/fidelisation/parrainage", label: "Parrainage", icon: Share2, managerOnly: true },
  { href: "/fidelisation/recompenses", label: "Récompenses", icon: Gift, managerOnly: true },
  { href: "/fidelisation/partage", label: "Partage", icon: QrCode, managerOnly: true },
  { href: "/fidelisation/parametres", label: "Paramètres", icon: Settings, managerOnly: true },
] as const;

/**
 * Routed section nav for the (formerly single, ~1500-line) Fidélisation page —
 * active state comes from the URL, not local state, since each section is now
 * its own route with its own targeted data fetch rather than a tab switch
 * inside one giant client component. Sections beyond "Clients" were previously
 * gated behind `{canManage && (...)}` inline on one page — same gate here, just
 * applied to which routes are surfaced (each route's own server actions remain
 * the real authorization backstop, same as the pre-split /recompenses route
 * already relied on).
 */
export function FidelisationSubNav() {
  const pathname = usePathname();
  const { role } = useApp();
  const canManage = role === "owner" || role === "manager";
  const sections = SECTIONS.filter((s) => !s.managerOnly || canManage);

  return (
    <div className="mb-6 flex items-center gap-6 border-b border-mv-border overflow-x-auto">
      {sections.map(({ href, label, icon: Icon }) => {
        const active = href === "/fidelisation" ? pathname === "/fidelisation" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 pb-3 text-[13px] font-medium transition-colors",
              active ? "text-mv-ink" : "text-mv-ink-faint hover:text-mv-ink-soft"
            )}
          >
            <Icon size={14} />
            {label}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-mv-ink" />}
          </Link>
        );
      })}
    </div>
  );
}
