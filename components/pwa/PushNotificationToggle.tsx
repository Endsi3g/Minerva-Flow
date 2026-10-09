"use client";

import {
  isPushConfiguredAction,
  subscribeToPushAction,
  unsubscribeFromPushAction,
} from "@/app/[locale]/(app)/notifications-actions";
import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePushBrowserSupport } from "@/hooks/use-browser-capabilities";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type PushState = "unsupported" | "not_configured" | "denied" | "subscribed" | "available";

export function PushNotificationToggle({ restaurantId }: { restaurantId: string | null }) {
  const pushSupported = usePushBrowserSupport();
  const [configuredState, setConfiguredState] = useState<PushState>("available");
  const state: PushState = pushSupported ? configuredState : "unsupported";
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported) return;

    isPushConfiguredAction().then(async (configured) => {
      if (!configured) {
        setConfiguredState("not_configured");
        return;
      }
      if (Notification.permission === "denied") {
        setConfiguredState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setConfiguredState(subscription ? "subscribed" : "available");
    });
  }, [pushSupported]);

  async function handleSubscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setConfiguredState(permission === "denied" ? "denied" : "available");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // iOS Safari's PushManager.getSubscription() is known to intermittently
      // return null for an installed PWA even when a subscription already
      // exists browser-side (a WebKit reliability gap, not something we
      // control) — re-checking right here, not just at mount, means a stale
      // "available" state self-heals into "subscribed" instead of creating
      // a redundant subscription every time the user clicks the button.
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          setConfiguredState("not_configured");
          return;
        }
        const subscribeOptions = {
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        };
        try {
          subscription = await registration.pushManager.subscribe(subscribeOptions);
        } catch {
          // A zombie subscription (browser holds internal state
          // getSubscription() didn't surface) can make a fresh subscribe()
          // throw — clear it and retry once before giving up.
          const zombie = await registration.pushManager.getSubscription();
          if (zombie) await zombie.unsubscribe();
          subscription = await registration.pushManager.subscribe(subscribeOptions);
        }
      }

      await subscribeToPushAction(restaurantId, subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setConfiguredState("subscribed");
    } catch {
      toast.error("L'activation des notifications a échoué. Réessayez.");
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
      setConfiguredState("available");
    } catch {
      toast.error("La désactivation a échoué. Réessayez.");
      // Re-derive the real state instead of assuming — a failed unsubscribe
      // can leave the browser subscription intact even if the server call succeeded.
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setConfiguredState(subscription ? "subscribed" : "available");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported" || state === "not_configured") return null;

  if (state === "denied") {
    return (
      <p className="border-b border-mv-border-soft px-3.5 py-2.5 text-[12px] text-mv-ink-faint">
        Notifications bloquées — activez-les dans les réglages de votre navigateur pour recevoir un son.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={state === "subscribed" ? handleUnsubscribe : handleSubscribe}
      className="flex w-full items-center gap-2 border-b border-mv-border-soft px-3.5 py-2.5 text-left text-[12px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-ink/[0.03] hover:text-mv-ink disabled:opacity-50"
    >
      {state === "subscribed" ? (
        <>
          <BellOff size={13} /> Désactiver les notifications
        </>
      ) : (
        <>
          <Bell size={13} /> Activer les notifications (avec son)
        </>
      )}
    </button>
  );
}
