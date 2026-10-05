"use client";

import { useSyncExternalStore } from "react";
import { Gift, Smartphone } from "lucide-react";
import { Link } from "@/i18n/navigation";

const isIosDevice = () =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/**
 * Shown on iPhone and iPad only (the app is iOS): rewards live in the app, so
 * this is the nudge to install it. Redeeming still works on the web for people
 * without an iPhone, so nobody is locked out.
 */
export function AppInstallPrompt({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string | null }) {
  // false on the server and during hydration; the real answer on the client.
  const ios = useSyncExternalStore(() => () => {}, isIosDevice, () => false);
  if (!ios) return null;

  const params = new URLSearchParams({ restaurant: restaurantId });
  if (restaurantName) params.set("name", restaurantName);

  return (
    <div className="mb-5 rounded-2xl border border-mv-green/25 bg-mv-green-tint/50 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-full bg-mv-surface p-2 text-mv-green-dark">
          <Gift size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold text-mv-ink">Vos récompenses sont dans l’app</p>
          <p className="mt-1 text-[14px] leading-relaxed text-mv-ink-soft">
            Installez Minerva Flow pour réclamer vos récompenses, suivre vos points et commander plus vite.
          </p>
          <Link
            href={`/app?${params.toString()}`}
            className="mt-3 inline-flex h-12 items-center gap-2 rounded-lg bg-mv-green px-4 text-[14px] font-semibold text-white hover:bg-mv-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green"
          >
            <Smartphone size={16} aria-hidden="true" /> Installer l’app
          </Link>
        </div>
      </div>
    </div>
  );
}
