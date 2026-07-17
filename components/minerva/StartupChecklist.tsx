"use client";

import { useCurrentRestaurant } from "@/lib/app-context";
import { getStartupProgressAction } from "@/app/(app)/overview/actions";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Building2, CalendarPlus, UserPlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_PREFIX = "mv-checklist-done:";

type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: typeof Building2;
  done: boolean;
};

export function StartupChecklist() {
  const restaurant = useCurrentRestaurant();
  const [progress, setProgress] = useState<{ serviceDaysCount: number; memberCount: number } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissedForGood, setDismissedForGood] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    getStartupProgressAction(restaurant.id).then(setProgress);
    setDismissedForGood(localStorage.getItem(STORAGE_PREFIX + restaurant.id) === "1");
  }, [restaurant?.id]);

  if (!restaurant || !progress || dismissedForGood) return null;

  const items: ChecklistItem[] = [
    {
      key: "etablissement",
      label: "Configurer votre établissement",
      description: "Donnez son vrai nom à votre établissement.",
      href: "/etablissement",
      icon: Building2,
      done: restaurant.name !== "Mon restaurant",
    },
    {
      key: "day",
      label: "Ajouter votre première journée",
      description: "La donnée de base qui alimente tous vos rapports.",
      href: "/days",
      icon: CalendarPlus,
      done: progress.serviceDaysCount > 0,
    },
    {
      key: "team",
      label: "Inviter un collaborateur",
      description: "Générez un lien d'invitation à partager.",
      href: "/collaborateurs",
      icon: UserPlus,
      done: progress.memberCount > 1,
    },
    {
      key: "insight",
      label: "Débloquer vos premières recommandations",
      description: "Ajoutez au moins 3 journées pour voir des insights sur vos propres chiffres.",
      href: "/overview",
      icon: Sparkles,
      done: progress.serviceDaysCount >= 3,
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone) {
    if (restaurant) localStorage.setItem(STORAGE_PREFIX + restaurant.id, "1");
    return null;
  }

  return (
    <div className="mv-animate-in mb-6 rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <div className="flex-1">
          <p className="font-display text-[15px] font-medium text-mv-ink">
            Démarrage — {doneCount}/{items.length} étapes complétées
          </p>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-mv-border-soft">
            <div
              className="h-full rounded-full bg-mv-green transition-all"
              style={{ width: `${(doneCount / items.length) * 100}%` }}
            />
          </div>
        </div>
        <ChevronDown size={16} className={cn("text-mv-ink-faint transition-transform", !collapsed && "rotate-180")} />
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 gap-2 border-t border-mv-border-soft p-3 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-start gap-3 rounded-xl px-3 py-3 transition-colors",
                item.done ? "opacity-60" : "hover:bg-mv-cream-soft"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  item.done ? "bg-mv-green text-mv-cream-soft" : "bg-mv-cream-soft text-mv-ink-soft"
                )}
              >
                {item.done ? <Check size={15} /> : <item.icon size={15} />}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-mv-ink">{item.label}</span>
                <span className="block text-[11.5px] text-mv-ink-faint">{item.description}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
