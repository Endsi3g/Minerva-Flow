import webpush from "web-push";
import {
  getPushSubscriptionsForUsers,
  deletePushSubscriptionByEndpoint,
} from "@/lib/data/push-subscriptions";

export function isPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
  );
}

let configured = false;
function ensureConfigured() {
  if (configured || !isPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export type PushPayload = {
  title: string;
  body?: string;
  link?: string;
};

/**
 * Sends a native push notification to every device a set of users has
 * subscribed from. Silently drops (and deletes) subscriptions Web Push
 * reports as gone — a browser can unregister without telling us. Never
 * throws: a push failure must not break the notification flow that
 * triggered it (in-app notifications already succeeded by this point).
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  restaurantId?: string
): Promise<void> {
  if (!isPushConfigured() || userIds.length === 0) return;
  ensureConfigured();

  const subscriptions = await getPushSubscriptionsForUsers(userIds, restaurantId);
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscriptionByEndpoint(sub.endpoint);
        } else {
          console.error("Web push failed:", err);
        }
      }
    })
  );
}
