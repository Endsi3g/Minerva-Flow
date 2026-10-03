"use client";

import { getPathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export function TeamPortalReplayIntroButton() {
  const locale = useLocale();

  return (
    <button
      type="button"
      onClick={() => {
        try {
          window.localStorage.removeItem("mv_team_intro_seen");
        } catch {
          // Storage unavailable — the intro's own "not seen yet" default applies.
        }
        // The intro lives on the portal home, not on every page.
        window.location.assign(getPathname({ href: "/equipe", locale }));
      }}
      className="text-[12.5px] font-medium text-mv-ink-faint hover:text-mv-ink"
    >
      Revoir l’intro
    </button>
  );
}
