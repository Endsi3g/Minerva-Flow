"use client";

import { useRealtimeBus } from "@/lib/realtime/RealtimeProvider";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Radio } from "lucide-react";

/** Compact, accessible signal for the active workspace's live data connection. */
export function LiveConnectionStatus({ compact = false }: { compact?: boolean }) {
  const { connectionState, lastEventAt } = useRealtimeBus();
  const t = useTranslations("realtime");
  if (connectionState === "idle") return null;

  const label = t(connectionState);
  const title = lastEventAt ? `${label} · ${t("lastUpdate", { time: new Date(lastEventAt).toLocaleTimeString() })}` : label;
  const dotTone = {
    live: "bg-emerald-600",
    connecting: "bg-amber-500 animate-pulse",
    reconnecting: "bg-amber-500 animate-pulse",
    offline: "bg-red-500",
    idle: "bg-mv-ink-faint",
  }[connectionState];

  return (
    <span
      role="status"
      aria-live="polite"
      title={title}
      className="inline-flex h-8 items-center gap-2 rounded-full border border-mv-border-soft bg-mv-surface px-2.5 text-[12px] font-medium text-mv-ink-soft"
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dotTone)} />
      {!compact && <><Radio size={13} aria-hidden="true" /><span>{label}</span></>}
      {compact && <span className="sr-only">{label}</span>}
    </span>
  );
}
