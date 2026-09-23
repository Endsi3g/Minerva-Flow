"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Megaphone, Palette, ShieldCheck } from "lucide-react";

const sections = [
  { href: "/campaigns", label: "Historique", icon: Megaphone },
  { href: "/campaigns/modeles", label: "Automatisations", icon: ShieldCheck },
  { href: "/campaigns/studio", label: "Studio visuel", icon: Palette },
] as const;

export function CampaignsSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections des campagnes" className="mb-5 flex gap-5 overflow-x-auto border-b border-mv-border">
      {sections.map(({ href, label, icon: Icon }) => {
        const active = href === "/campaigns" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex shrink-0 items-center gap-2 pb-3 text-[13px] font-medium transition-colors",
              active ? "text-mv-ink" : "text-mv-ink-faint hover:text-mv-ink-soft"
            )}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-mv-green" />}
          </Link>
        );
      })}
    </nav>
  );
}
