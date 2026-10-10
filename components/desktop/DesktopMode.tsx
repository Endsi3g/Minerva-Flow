"use client";

import { useEffect } from "react";
import { DESKTOP_COOKIE, isDesktopApp } from "@/lib/desktop/bridge";

/**
 * Marks the document when the portal runs inside the desktop app (or opened
 * with ?desktop=1 from its splash screen) so styles can switch to the cleaner
 * desktop layout. The marker survives navigation through a session cookie.
 */
export function DesktopMode() {
  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("desktop") === "1";
    const fromCookie = document.cookie.split("; ").some((entry) => entry === `${DESKTOP_COOKIE}=1`);
    if (isDesktopApp() || fromQuery || fromCookie) {
      document.documentElement.dataset.desktop = "1";
      document.cookie = `${DESKTOP_COOKIE}=1; path=/; SameSite=Lax; Secure`;
    }
  }, []);
  return null;
}
