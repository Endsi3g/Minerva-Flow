"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SettingsPage = "integrations" | "alertes" | "parrainage" | "securite" | "apparence";

const hrefByPage: Record<SettingsPage, string> = {
  integrations: "/settings",
  alertes: "/settings/alertes",
  parrainage: "/settings/parrainage",
  securite: "/settings/securite",
  apparence: "/settings/apparence",
};

const labelByPage: Record<SettingsPage, { label: string; description: string }> = {
  integrations: { label: "Intégrations", description: "Caisses, paiements et plateformes connectées." },
  alertes: { label: "Règles d'alertes", description: "Seuils automatiques de détection et notifications." },
  parrainage: { label: "Parrainage", description: "Programmes de recommandation clients." },
  securite: { label: "Sécurité", description: "Appareils connectés et sessions actives." },
  apparence: { label: "Apparence", description: "Thème clair, sombre ou système." },
};

export function SettingsNav({ active }: { active: SettingsPage }) {
  const pages: SettingsPage[] = ["integrations", "alertes", "parrainage", "securite", "apparence"];

  return (
    <nav aria-label="Sections des paramètres" className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {pages.map((page) => (
        <Link
          key={page}
          href={hrefByPage[page]}
          aria-current={active === page ? "page" : undefined}
          className={cn(
            "rounded-xl border p-3 transition-colors",
            active === page
              ? "border-mv-green/30 bg-mv-green-tint/60 text-mv-green-dark"
              : "border-mv-border-soft bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft hover:text-mv-ink"
          )}
        >
          <span className="block text-[12.5px] font-semibold">{labelByPage[page].label}</span>
          <span className="mt-1 block text-[12px] leading-relaxed text-mv-ink-faint">{labelByPage[page].description}</span>
        </Link>
      ))}
    </nav>
  );
}
