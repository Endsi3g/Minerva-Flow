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
 * Notifies every owner of a workspace — used for workspace-level billing
 * events (Stripe). Each owner's notification row is stamped with their
 * first active restaurant, the same resolution trick notifyAllUsers uses,
 * since the notifications table is restaurant-scoped and there is no
 * workspace-level notifications path yet.
 */
export async function notifyWorkspaceOwners(input: {
  workspaceId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: owners } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", input.workspaceId)
    .eq("role", "owner")
    .eq("status", "active");

  const ownerIds = ((owners as { user_id: string }[]) ?? []).map((m) => m.user_id);
  if (ownerIds.length === 0) return;

  const { data: memberships } = await admin
    .from("restaurant_members")
    .select("user_id, restaurant_id")
    .in("user_id", ownerIds)
    .eq("status", "active");

  const seenUsers = new Set<string>();
  const usersByRestaurant = new Map<string, string[]>();
  for (const row of (memberships as { user_id: string; restaurant_id: string }[]) ?? []) {
    if (seenUsers.has(row.user_id)) continue; // only the user's first active restaurant, like notifyAllUsers
    seenUsers.add(row.user_id);
    const list = usersByRestaurant.get(row.restaurant_id) ?? [];
    list.push(row.user_id);
    usersByRestaurant.set(row.restaurant_id, list);
  }

  await Promise.all(
    Array.from(usersByRestaurant.entries()).map(([restaurantId, userIds]) =>
      broadcastNotification({
        restaurantId,
        userIds,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      })
    )
  );
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
 * Notifies every customer linked to a restaurant (an active `customers` row
 * with a `user_id`) — used for client-facing events like a new offer.
 * Unlike broadcastNotification, this does NOT insert a `notifications` row:
 * that table/its RLS assume a restaurant_members reader, and customers have
 * no in-app notification inbox — the active-offers list on /m/[token] is
 * already the source of truth, push is just the "come back" nudge.
 */
export async function notifyCustomers(input: {
  restaurantId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customers")
    .select("user_id")
    .eq("restaurant_id", input.restaurantId)
    .not("user_id", "is", null);

  const userIds = ((data as { user_id: string | null }[]) ?? [])
    .map((c) => c.user_id)
    .filter((id): id is string => Boolean(id));

  await sendPushToUsers(userIds, { title: input.title, body: input.body, link: input.link });
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
