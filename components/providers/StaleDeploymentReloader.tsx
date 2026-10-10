"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

const RELOAD_STORAGE_KEY = "mv_stale_action_last_reload";
const RELOAD_COOLDOWN_MS = 15000;

function isStaleActionError(value: unknown): boolean {
  if (!value) return false;
  const str =
    typeof value === "string"
      ? value
      : value instanceof Error
      ? `${value.name} ${value.message} ${(value as { digest?: string }).digest ?? ""}`
      : String(value);

  const lower = str.toLowerCase();
  return (
    lower.includes("failed to find server action") ||
    lower.includes("unrecognizedactionerror") ||
    lower.includes("older deployment") ||
    lower.includes("action not found")
  );
}

function triggerStaleReload(reason: string) {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_STORAGE_KEY) || 0);
    const now = Date.now();
    if (now - last < RELOAD_COOLDOWN_MS) {
      console.warn("[StaleDeploymentReloader] Cooldown active, suppressing reload loop:", reason);
      return;
    }

    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(now));
    try {
      posthog.capture?.("stale_deployment_reloaded", {
        reason,
        url: window.location.href,
      });
    } catch {
      // Telemetry best-effort
    }

    console.info("[StaleDeploymentReloader] Stale Server Action detected. Reloading page to update assets...");
    window.location.reload();
  } catch (err) {
    console.error("[StaleDeploymentReloader] Failed to trigger reload:", err);
  }
}

/**
 * Global client-side interceptor for Next.js Server Action version skew.
 *
 * When a deployment occurs while an end-user has an existing tab open, the browser's
 * cached JS calls a Server Action hash that no longer exists in the newly deployed build,
 * raising an UnrecognizedActionError ("Failed to find Server Action...").
 *
 * This component listens for unhandled promise rejections and global errors matching that signature,
 * logs a PostHog event, and cleanly reloads the document with a 15-second cooldown guard.
 */
export function StaleDeploymentReloader() {
  useEffect(() => {
    function handleRejection(event: PromiseRejectionEvent) {
      if (isStaleActionError(event.reason)) {
        event.preventDefault();
        triggerStaleReload(String(event.reason?.message || event.reason));
      }
    }

    function handleError(event: ErrorEvent) {
      if (isStaleActionError(event.error) || isStaleActionError(event.message)) {
        event.preventDefault();
        triggerStaleReload(String(event.error?.message || event.message));
      }
    }

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
