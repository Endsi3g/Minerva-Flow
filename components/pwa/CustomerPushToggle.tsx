"use client";

import {
  isPushConfiguredAction,
  subscribeToPushAction,
  unsubscribeFromPushAction,
} from "@/app/m/[token]/push-actions";
import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type PushState = "unsupported" | "not_configured" | "denied" | "subscribed" | "available" | "error";

/**
 * Customer-facing variant of components/pwa/PushNotificationToggle.tsx —
 * rendered on the public menu page for authenticated (magic-link) customers
 * so they get notified when the restaurant publishes a new offer. Same
 * browser plumbing, but styled as an inline pill instead of a topbar menu
 * entry, and wired to the public route group's server actions.
 */
export function CustomerPushToggle({ restaurantId }: { restaurantId: string }) {
  const [state, setState] = useState<PushState>("available");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    isPushConfiguredAction().then(async (configured) => {
      if (!configured) {
        setState("not_configured");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState(subscription ? "subscribed" : "available");
    });
  }, []);

  async function handleSubscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "available");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setState("not_configured");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      await subscribeToPushAction(
        restaurantId,
        subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      );
      setState("subscribed");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeFromPushAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("available");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported" || state === "not_configured") return null;

  if (state === "denied") {
    return (
      <p className="mb-5 text-[11.5px] text-mv-ink-faint">
        Notifications bloquées — activez-les dans les réglages de votre navigateur pour recevoir les offres.
      </p>
    );
  }

  if (state === "error") {
    return (
      <p className="mb-5 text-[11.5px] text-mv-ink-faint">
        Une erreur est survenue. Réessayez plus tard.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={state === "subscribed" ? handleUnsubscribe : handleSubscribe}
      className="mb-5 flex items-center gap-2 rounded-full border border-mv-border bg-mv-surface px-3.5 py-2 text-[12.5px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-cream-soft hover:text-mv-ink disabled:opacity-50"
    >
      {state === "subscribed" ? (
        <>
          <BellOff size={14} /> Ne plus recevoir les offres
        </>
      ) : (
        <>
          <Bell size={14} /> Recevoir les nouvelles offres
        </>
      )}
    </button>
  );
}
