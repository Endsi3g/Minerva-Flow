import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send";

export type Notification = {
  id: string;
  restaurantId: string;
  userId: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    read: row.read,
    createdAt: row.created_at,
  };
}

/** Notifications for the current signed-in user within a restaurant, newest first. */
export async function getNotifications(restaurantId: string, limit = 20): Promise<Notification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as NotificationRow[]).map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(restaurantId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .eq("read", false);
}

/**
 * Server-only (service role) — used by the weekly-report cron route to fan
 * out one notification row per active member, bypassing RLS since there is
 * no authenticated request context in a cron invocation.
 */
export async function broadcastNotification(input: {
  restaurantId: string;
  userIds: string[];
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  if (input.userIds.length === 0) return;
  const admin = createAdminClient();
  await admin.from("notifications").insert(
    input.userIds.map((userId) => ({
      restaurant_id: input.restaurantId,
      user_id: userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    }))
  );

  await sendPushToUsers(input.userIds, { title: input.title, body: input.body, link: input.link });
}

/**
 * Notifies every active user across every restaurant on the platform —
 * used for platform-wide announcements (changelog entries) rather than
 * restaurant-scoped events. `restaurant_id` on the notification row is set
 * to each user's first active restaurant purely so the existing
 * restaurant-scoped read path (getNotifications) picks it up; the content
 * itself isn't restaurant-specific.
 */
export async function notifyAllUsers(input: {
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from("restaurant_members").select("user_id, restaurant_id").eq("status", "active");

  const rows = (data as { user_id: string; restaurant_id: string }[]) ?? [];
  const restaurantIdByUser = new Map<string, string>();
  for (const row of rows) {
    if (!restaurantIdByUser.has(row.user_id)) restaurantIdByUser.set(row.user_id, row.restaurant_id);
  }

  const inserts = Array.from(restaurantIdByUser.entries()).map(([userId, restaurantId]) => ({
    restaurant_id: restaurantId,
    user_id: userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  }));

  if (inserts.length === 0) return;
  await admin.from("notifications").insert(inserts);

  await sendPushToUsers(Array.from(restaurantIdByUser.keys()), {
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

/**
 * Notifies only the restaurant's owners — used for billing events (Stripe),
 * which staff/consultants don't need to see.
 */
export async function notifyRestaurantOwners(input: {
  restaurantId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurant_members")
    .select("user_id")
    .eq("restaurant_id", input.restaurantId)
    .eq("role", "owner")
    .eq("status", "active");

  const userIds = ((data as { user_id: string }[]) ?? []).map((m) => m.user_id);
  await broadcastNotification({
    restaurantId: input.restaurantId,
    userIds,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

/**
 * Notifies owners and managers only — used for app-error surfacing
 * (lib/notify-error.ts) so the people who'd act on a recurring failure see
 * it without paging every staff member for every failed click.
 */
export async function notifyRestaurantManagement(input: {
  restaurantId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurant_members")
    .select("user_id")
    .eq("restaurant_id", input.restaurantId)
    .in("role", ["owner", "manager"])
    .eq("status", "active");

  const userIds = ((data as { user_id: string }[]) ?? []).map((m) => m.user_id);
  await broadcastNotification({
    restaurantId: input.restaurantId,
    userIds,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

/**
 * Notifies every active member of a restaurant (optionally excluding the
 * actor who triggered the event, so people don't get notified about their
 * own action). Thin wrapper around broadcastNotification for the common
 * "something happened in this restaurant" case — invites, campaigns, etc.
 */
export async function notifyRestaurant(input: {
  restaurantId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  excludeUserId?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurant_members")
    .select("user_id")
    .eq("restaurant_id", input.restaurantId)
    .eq("status", "active");

  const userIds = ((data as { user_id: string }[]) ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== input.excludeUserId);

  await broadcastNotification({
    restaurantId: input.restaurantId,
    userIds,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });
}
