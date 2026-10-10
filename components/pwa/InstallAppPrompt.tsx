"use client";


import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocalStorageBoolean } from "@/hooks/use-local-storage-state";
import { Share, SquarePlus, X, Smartphone } from "lucide-react";

const DISMISS_KEY = "mv-install-prompt-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Dismissable banner nudging mobile visitors to install the app on their
 * home screen. Android/Chrome gets a native install button (via the
 * captured beforeinstallprompt event); iOS Safari has no such API, so it
 * gets step-by-step manual instructions instead — per the Next.js PWA guide.
 * Hidden entirely when already running standalone (installed).
 */
export function InstallAppPrompt() {
  const t = useTranslations("installPrompt");
  const [dismissed, setDismissed] = useLocalStorageBoolean(DISMISS_KEY, true, "1", "session");
  const standalone = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => true
  );
  const isIOS = useSyncExternalStore(
    () => () => {},
    () => /iPad|iPhone|iPod/.test(navigator.userAgent),
    () => false
  );
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;


    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function handleDismiss() {
    setDismissed(true);
  }

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setDismissed(true);
  }

  if (dismissed || standalone || (!isIOS && !installEvent)) return null;

  return (
    <div className="mb-5 rounded-xl border border-mv-lime-dark/30 bg-mv-lime-tint px-4 py-3">
      <div className="flex items-start gap-3">
        <Smartphone size={18} className="mt-0.5 shrink-0 text-mv-green-dark" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-mv-ink">{t("installTheAppOn")}</p>
          {isIOS ? (
            <p className="mt-1 text-[12px] leading-relaxed text-mv-ink-soft">
              Touchez <Share size={12} className="inline align-text-bottom" /> <b>{t("share")}</b> puis{" "}
              <SquarePlus size={12} className="inline align-text-bottom" /> <b>{t("addToHomeScreen")}</b>{" "}
              {t("toFindTheMenu")}
            </p>
          ) : (
            <p className="mt-1 text-[12px] leading-relaxed text-mv-ink-soft">
              {t("findTheMenuAnd")}
            </p>
          )}
          {!isIOS && installEvent && (
            <button
              onClick={handleInstall}
              className="mt-2 rounded-lg bg-mv-green px-3 py-1.5 text-[12.5px] font-semibold text-mv-cream-soft transition-colors hover:bg-mv-green-dark"
            >
              Installer
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Fermer"
          className="shrink-0 rounded-lg p-1 text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
