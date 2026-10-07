"use client";

import { getPathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { RotateCcw } from "lucide-react";

export function TeamPortalReplayIntroButton() {
  const locale = useLocale();

  return (
    <button
      type="button"
      aria-label="Revoir l’intro"
      title="Revoir l’intro"
      onClick={() => {
        try {
          window.localStorage.removeItem("mv_team_intro_seen");
        } catch {
          // Storage unavailable — the intro's own "not seen yet" default applies.
        }
        // The intro lives on the portal home, not on every page.
        window.location.assign(getPathname({ href: "/equipe", locale }));
      }}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 text-[12.5px] font-medium text-mv-ink-faint hover:text-mv-ink"
    >
      <RotateCcw size={16} aria-hidden="true" className="lg:hidden" />
      <span className="hidden lg:inline">Revoir l’intro</span>
    </button>
  );
}
