"use client";

import { useApp } from "@/lib/app-context";
import { getNotificationsAction, markNotificationReadAction } from "@/app/(app)/notifications-actions";
import type { Notification } from "@/lib/data/notifications";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Publishing a changelog entry (publishChangelogEntryAction) inserts a
 * "changelog.published" notification for every active user. This surfaces
 * the most recent unread one as a dismissible top banner — dismissing marks
 * it read server-side, so unlike WorkspaceSetupBanner it does not resurface
 * on the next login.
 */
export function UpdateBanner() {
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
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-mv-green/25 bg-mv-green/[0.06] px-4 py-3">
      <Sparkles size={18} className="shrink-0 text-mv-green-dark" />
      <p className="flex-1 text-[13px] font-medium text-mv-ink">{entry.body ?? entry.title}</p>
      <Link
        href={entry.link ?? "/changelog"}
        onClick={handleDismiss}
        className="shrink-0 rounded-lg bg-mv-green px-3 py-1.5 text-[12.5px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-green-dark"
      >
        Voir les nouveautés
      </Link>
      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        className="shrink-0 rounded-lg p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
      >
        <X size={15} />
      </button>
    </div>
  );
}
