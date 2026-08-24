"use client";

import { useApp } from "@/lib/app-context";
import { getNotificationsAction, markNotificationReadAction } from "@/app/[locale]/(app)/notifications-actions";
import type { Notification } from "@/lib/data/notifications";
import { Sparkles, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * Publishing a changelog entry (publishChangelogEntryAction) inserts a
 * "changelog.published" notification for every active user. This surfaces
 * the most recent unread one as a dismissible top banner — dismissing marks
 * it read server-side, so unlike WorkspaceSetupBanner it does not resurface
 * on the next login.
 */
export function UpdateBanner() {
  const t = useTranslations("shell");
  const { restaurantId } = useApp();
  const [entry, setEntry] = useState<Notification | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    getNotificationsAction(restaurantId).then((notifs) => {
      if (cancelled) return;
      const latest = notifs.find((n) => n.type === "changelog.published" && !n.read);
      setEntry(latest ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  if (!entry) return null;

  function handleDismiss() {
    if (entry) markNotificationReadAction(entry.id);
    setEntry(null);
  }

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-mv-green/25 bg-mv-green/[0.06] px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3 sm:flex-1 sm:items-center">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-mv-green-dark sm:mt-0" />
        <p className="text-[13px] font-medium text-mv-ink">{entry.body ?? entry.title}</p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 self-end sm:self-auto">
        <Link
          href={entry.link ?? "/changelog"}
          onClick={handleDismiss}
          className="shrink-0 rounded-lg bg-mv-green px-3 py-1.5 text-[12.5px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-green-dark"
        >
          {t("viewChangelog")}
        </Link>
        <button
          onClick={handleDismiss}
          aria-label={t("close")}
          className="shrink-0 rounded-lg p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
