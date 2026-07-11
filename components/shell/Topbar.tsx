"use client";

import { useApp, roleLabels } from "@/lib/app-context";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, User, Check, Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Period } from "@/lib/app-context";
import type { Role } from "@/lib/types";

const periods: { id: Period; label: string }[] = [
  { id: "jour", label: "Jour" },
  { id: "semaine", label: "Semaine" },
  { id: "mois", label: "Mois" },
  { id: "custom", label: "Personnalisé" },
];

const crumbLabels: Record<string, string> = {
  overview: "Overview",
  programs: "Programs",
  days: "Days",
  finance: "Finance",
  campaigns: "Campaigns",
  maps: "Maps",
  settings: "Settings",
  reports: "Reports",
};

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

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments
    .filter((s) => crumbLabels[s] || segments.indexOf(s) === segments.length - 1)
    .map((s) => crumbLabels[s] ?? s);

  return (
    <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-mv-ink">
      {crumbs.length === 0 ? (
        <span>Overview</span>
      ) : (
        crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-mv-ink-faint">/</span>}
            <span className={i === crumbs.length - 1 ? "text-mv-ink" : "text-mv-ink-faint"}>
              {c}
            </span>
          </span>
        ))
      )}
    </div>
  );
}

function PeriodFilter() {
  const { period, setPeriod } = useApp();
  return (
    <div className="flex h-9 items-center rounded-lg border border-mv-border bg-mv-surface p-0.5">
      {periods.map((p) => (
        <button
          key={p.id}
          onClick={() => setPeriod(p.id)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
            period === p.id
              ? "bg-mv-green text-mv-cream-soft"
              : "text-mv-ink-soft hover:text-mv-ink"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function UserMenu() {
  const { role, setRole } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const name = "Camille Andrieu";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-mv-ink/5"
      >
        <Avatar name={name} size={30} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[13px] font-semibold text-mv-ink">{name}</span>
          <span className="block text-[11.5px] text-mv-ink-faint">{roleLabels[role]}</span>
        </span>
        <ChevronDown size={14} className="text-mv-ink-faint" />
      </button>
      {open && (
        <div className="mv-animate-in absolute right-0 top-12 z-40 w-64 rounded-xl border border-mv-border bg-mv-surface p-1.5 shadow-mv-lg">
          <div className="px-2.5 py-2">
            <p className="text-[13px] font-semibold text-mv-ink">{name}</p>
            <p className="text-[12px] text-mv-ink-faint">quebecsaas@gmail.com</p>
          </div>
          <div className="border-t border-mv-border-soft px-2.5 py-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              Rôle (démo)
            </p>
            <div className="space-y-0.5">
              {(Object.keys(roleLabels) as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12.5px] font-medium",
                    role === r
                      ? "bg-mv-green-tint text-mv-green-dark"
                      : "text-mv-ink-soft hover:bg-mv-cream-soft"
                  )}
                >
                  {roleLabels[r]}
                  {role === r && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1 border-t border-mv-border-soft pt-1.5">
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-mv-ink-soft hover:bg-mv-cream-soft">
              <User size={15} /> Profil
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-mv-red hover:bg-mv-red-bg">
              <LogOut size={15} /> Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-mv-border bg-mv-cream-soft px-6">
      <Breadcrumb />
      <div className="flex items-center gap-3">
        <PeriodFilter />
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-mv-border bg-mv-surface text-mv-ink-soft transition-colors hover:bg-mv-cream-soft">
          <Bell size={16} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-mv-red" />
        </button>
        <div className="h-6 w-px bg-mv-border" />
        <UserMenu />
      </div>
    </header>
  );
}
