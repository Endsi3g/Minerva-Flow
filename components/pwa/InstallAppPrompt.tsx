"use client";

import { useEffect, useState } from "react";
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
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    // iOS never fires beforeinstallprompt — show the manual instructions.
    if (ios) setVisible(true);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-5 rounded-xl border border-mv-lime-dark/30 bg-mv-lime-tint px-4 py-3">
      <div className="flex items-start gap-3">
        <Smartphone size={18} className="mt-0.5 shrink-0 text-mv-green-dark" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-mv-ink">Installez l&apos;app sur votre téléphone</p>
          {isIOS ? (
            <p className="mt-1 text-[12px] leading-relaxed text-mv-ink-soft">
              Touchez <Share size={12} className="inline align-text-bottom" /> <b>Partager</b> puis{" "}
              <SquarePlus size={12} className="inline align-text-bottom" /> <b>Sur l&apos;écran d&apos;accueil</b>{" "}
              pour retrouver le menu et vos points en un geste.
            </p>
          ) : (
            <p className="mt-1 text-[12px] leading-relaxed text-mv-ink-soft">
              Retrouvez le menu et vos points de fidélité en un geste, et recevez les nouvelles offres.
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
