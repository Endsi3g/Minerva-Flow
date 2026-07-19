"use client";

import { useCurrentRestaurant } from "@/lib/app-context";
import { X, Store } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const DEFAULT_NAME = "Mon restaurant";
const DISMISS_KEY_PREFIX = "mv-workspace-banner-dismissed:";

/**
 * Accounts created before the onboarding wizard existed (migration 0009)
 * were backfilled with onboarding_completed=true and a restaurant literally
 * named "Mon restaurant" — they never see a setup flow. This nudges them
 * toward /etablissement without blocking access; dismissing only hides it
 * for the current session (sessionStorage), so it resurfaces on the next
 * login until the restaurant is actually renamed.
 */
export function WorkspaceSetupBanner() {
  const t = useTranslations("shell");
  const restaurant = useCurrentRestaurant();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    setDismissed(sessionStorage.getItem(DISMISS_KEY_PREFIX + restaurant.id) === "1");
  }, [restaurant?.id]);

  if (!restaurant || restaurant.name !== DEFAULT_NAME || dismissed) return null;

  function handleDismiss() {
    if (restaurant) sessionStorage.setItem(DISMISS_KEY_PREFIX + restaurant.id, "1");
    setDismissed(true);
  }

  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-mv-lime-dark/30 bg-mv-lime-tint px-4 py-3">
      <Store size={18} className="shrink-0 text-mv-green-dark" />
      <p className="flex-1 text-[13px] font-medium text-mv-ink">
        {t("workspaceBannerText")}
      </p>
      <Link
        href="/etablissement"
        className="shrink-0 rounded-lg bg-mv-green px-3 py-1.5 text-[12.5px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-green-dark"
      >
        {t("configure")}
      </Link>
      <button
        onClick={handleDismiss}
        aria-label={t("close")}
        className="shrink-0 rounded-lg p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
      >
        <X size={15} />
      </button>
    </div>
  );
}
