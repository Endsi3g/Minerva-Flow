"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Registers the service worker and surfaces a floating "new version" pill
 * when an updated sw.js has finished installing but is still waiting
 * (there's an existing tab/PWA instance still controlled by the old one).
 * This is the only way to roll out an update on an iOS home-screen PWA
 * without the user deleting and re-adding it.
 */
export function ServiceWorkerManager() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(registration.waiting);
          }
        });
      });
    });

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);

  if (!waitingWorker) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center md:bottom-6">
      {/* Deliberately fixed dark colors, not theme tokens — this persistent
          toast stays a high-contrast dark banner in both light and dark mode. */}
      <div className="flex items-center gap-3 rounded-full border border-[#33392a] bg-[#1a1e16] px-4 py-2.5 shadow-lg">
        <span className="text-[12.5px] font-medium text-[#fbf9f3]">Nouvelle version disponible</span>
        <button
          onClick={() => waitingWorker.postMessage("SKIP_WAITING")}
          className="flex items-center gap-1.5 rounded-full bg-[#fbf9f3] px-3 py-1 text-[12px] font-semibold text-[#1a1e16] transition-colors hover:bg-white"
        >
          <RefreshCw size={12} /> Actualiser
        </button>
      </div>
    </div>
  );
}
