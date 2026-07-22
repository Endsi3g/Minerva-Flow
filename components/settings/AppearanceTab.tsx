"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { cn } from "@/lib/utils";
import { Sun, Moon, Monitor } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
] as const;

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Card>
      <CardHeader eyebrow="Apparence" title="Thème" />
      <p className="mt-1 text-[12.5px] text-mv-ink-soft">
        Choisissez l&apos;apparence de l&apos;application, ou laissez-la suivre les préférences de votre appareil.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 max-w-md">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-[12.5px] font-semibold transition-colors",
                active
                  ? "border-mv-green bg-mv-green/10 text-mv-green-dark"
                  : "border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
              )}
              aria-pressed={active}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
