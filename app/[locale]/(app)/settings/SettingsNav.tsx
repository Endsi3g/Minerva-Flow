"use client";


import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useIsDesktopApp } from "@/lib/desktop/useDesktop";

type SettingsPage = "integrations" | "alertes" | "parrainage" | "securite" | "apparence" | "poste";

const hrefByPage: Record<SettingsPage, string> = {
  integrations: "/settings",
  alertes: "/settings/alertes",
  parrainage: "/settings/parrainage",
  securite: "/settings/securite",
  apparence: "/settings/apparence",
  poste: "/settings/poste",
};

function buildLabelByPage(t: (key: string) => string): Record<SettingsPage, { label: string; description: string }> {
  return {
  integrations: { label: t("integrations"), description: t("connectedRegistersPaymentsAnd") },
  alertes: { label: t("alertRules"), description: t("automaticDetectionThresholdsAnd") },
  parrainage: { label: t("referral"), description: t("customerReferralPrograms") },
  securite: { label: t("security"), description: t("connectedDevicesAndActive") },
  apparence: { label: t("appearance"), description: t("lightDarkOrSystem") },
  poste: { label: "Poste de caisse", description: "Alertes, impression et plein écran" },
};
}

export function SettingsNav({ active }: { active: SettingsPage }) {
  const t = useTranslations("settingsNav");
  const desktop = useIsDesktopApp();
  const pages: SettingsPage[] = ["integrations", "alertes", "parrainage", "securite", "apparence", ...(desktop || active === "poste" ? (["poste"] as const) : [])];

  return (
    <nav aria-label={t("settingsSections")} className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
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
          <span className="block text-[12.5px] font-semibold">{buildLabelByPage(t)[page].label}</span>
          <span className="mt-1 block text-[12px] leading-relaxed text-mv-ink-faint">{buildLabelByPage(t)[page].description}</span>
        </Link>
      ))}
    </nav>
  );
}
