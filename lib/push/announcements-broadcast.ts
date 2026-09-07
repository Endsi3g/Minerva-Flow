import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send";
import { sendApnsToTokens, isAPNsConfigured } from "@/lib/push/apns";

export type BroadcastPayload = {
  title: string;
  body: string;
  link?: string;
};

/**
 * Broadcasts an announcement notification to all registered users/customers
 * across both Web Push and iOS APNs.
 */
export async function broadcastAnnouncementNotification(payload: BroadcastPayload): Promise<{
  webPushSent: number;
  apnsSent: number;
}> {
  const admin = createAdminClient();

  // 1. Fetch all unique user_ids from push_subscriptions (Web Push)
  const { data: webSubs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .not("user_id", "is", null);

  const uniqueWebUserIds = Array.from(new Set((webSubs || []).map((s) => s.user_id)));

  if (uniqueWebUserIds.length > 0) {
    await sendPushToUsers(uniqueWebUserIds, {
      title: payload.title,
      body: payload.body,
      link: payload.link || "/portal",
    });
  }

  // 2. Fetch all APNs device tokens (iOS Native App)
  let apnsCount = 0;
  if (isAPNsConfigured()) {
    const { data: iosTokens } = await admin
      .from("device_push_tokens")
      .select("token")
      .eq("platform", "ios");

    const tokens = (iosTokens || []).map((t) => t.token);
    if (tokens.length > 0) {
      await sendApnsToTokens(tokens, {
        title: payload.title,
        body: payload.body,
        link: payload.link || "/portal",
      });
      apnsCount = tokens.length;
    }
  }

  return {
    webPushSent: uniqueWebUserIds.length,
    apnsSent: apnsCount,
  };
}
