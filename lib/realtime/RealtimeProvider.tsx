"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type RealtimeConnectionState = "idle" | "connecting" | "live" | "reconnecting" | "offline";
export type RealtimeTable =
  | "activity_log"
  | "alerts"
  | "campaigns"
  | "customers"
  | "employees"
  | "financial_transactions"
  | "inventory_items"
  | "inventory_low_stock_state"
  | "loyalty_rewards"
  | "loyalty_transactions"
  | "menu_items"
  | "notifications"
  | "offers"
  | "order_status_events"
  | "orders"
  | "purchase_orders"
  | "reservation_status_events"
  | "reservations"
  | "restaurant_members"
  | "revenue_programs"
  | "service_days"
  | "shift_schedules"
  | "suppliers"
  | "team_chat_messages"
  | "reward_redemptions";

export type RealtimeDomainEvent = {
  table: RealtimeTable;
  eventType: "INSERT" | "UPDATE";
  recordId: string | null;
  restaurantId: string;
  occurredAt: string;
};

export type RealtimeAlertPayload = {
  id: string;
  restaurant_id: string;
  type: string;
  severity: "critique" | "important" | "info";
  title: string;
  detail: string;
  status: "nouvelle" | "revue" | "assignee";
  assigned_to: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
};

export type RealtimeNotificationPayload = {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  action_url?: string | null;
  read: boolean;
  created_at: string;
};

type AlertListener = (alert: RealtimeAlertPayload) => void;
type NotificationListener = (notification: RealtimeNotificationPayload) => void;
type OrderListener = (orderPayload: { id: string; status: string }) => void;
type ChangeListener = (event: RealtimeDomainEvent) => void;

interface RealtimeContextValue {
  restaurantId: string | null;
  connectionState: RealtimeConnectionState;
  lastEventAt: string | null;
  requestDebouncedRefresh: (delayMs?: number) => void;
  subscribeAlerts: (listener: AlertListener) => () => void;
  subscribeNotifications: (listener: NotificationListener) => () => void;
  subscribeOrders: (listener: OrderListener) => () => void;
  subscribeChanges: (listener: ChangeListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  restaurantId: null,
  connectionState: "idle",
  lastEventAt: null,
  requestDebouncedRefresh: () => {},
  subscribeAlerts: () => () => {},
  subscribeNotifications: () => () => {},
  subscribeOrders: () => () => {},
  subscribeChanges: () => () => {},
});

const TENANT_TABLES: RealtimeTable[] = [
  "activity_log",
  "campaigns",
  "customers",
  "employees",
  "financial_transactions",
  "inventory_items",
  "inventory_low_stock_state",
  "loyalty_rewards",
  "loyalty_transactions",
  "menu_items",
  "offers",
  "order_status_events",
  "orders",
  "purchase_orders",
  "reservation_status_events",
  "reservations",
  "restaurant_members",
  "revenue_programs",
  "service_days",
  "shift_schedules",
  "suppliers",
  "team_chat_messages",
  "reward_redemptions",
];

/**
 * Unified Realtime Provider:
 * Consolidates all component-level Supabase channels into a single multiplexed
 * channel per restaurant (`restaurant-bus-${restaurantId}`).
 *
 * Batches incoming mutations with debounced router.refresh() (cooldown window)
 * to prevent burst events (e.g. rush-hour POS sync) from overwhelming Next.js RSC rendering.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { restaurantId, authUser } = useApp();
  const authUserId = authUser?.id;
  const router = useRouter();

  const alertListenersRef = useRef<Set<AlertListener>>(new Set());
  const notificationListenersRef = useRef<Set<NotificationListener>>(new Set());
  const orderListenersRef = useRef<Set<OrderListener>>(new Set());
  const changeListenersRef = useRef<Set<ChangeListener>>(new Set());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  const requestDebouncedRefresh = useCallback(
    (delayMs = 1200) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
        refreshTimeoutRef.current = null;
      }, delayMs);
    },
    [router]
  );

  const subscribeAlerts = useCallback((listener: AlertListener) => {
    alertListenersRef.current.add(listener);
    return () => {
      alertListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeNotifications = useCallback((listener: NotificationListener) => {
    notificationListenersRef.current.add(listener);
    return () => {
      notificationListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeOrders = useCallback((listener: OrderListener) => {
    orderListenersRef.current.add(listener);
    return () => {
      orderListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeChanges = useCallback((listener: ChangeListener) => {
    changeListenersRef.current.add(listener);
    return () => changeListenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    if (!restaurantId || !authUserId) return;

    const supabase = createClient();
    const channelName = `restaurant-bus-${restaurantId}`;
    let disposed = false;

    const markNetworkState = () => {
      if (disposed) return;
      setConnectionState(navigator.onLine ? "reconnecting" : "offline");
    };

    const handleChange = (
      table: RealtimeTable,
      eventType: "INSERT" | "UPDATE",
      payload: RealtimePostgresChangesPayload<Record<string, unknown>>
    ) => {
      const row = payload.new as Record<string, unknown> | null;
      const recordId = typeof row?.id === "string" ? row.id : null;
      const event: RealtimeDomainEvent = {
        table,
        eventType,
        recordId,
        restaurantId,
        occurredAt: new Date().toISOString(),
      };
      setLastEventAt(event.occurredAt);
      changeListenersRef.current.forEach((fn) => fn(event));

      if (table === "alerts" && row) {
        alertListenersRef.current.forEach((fn) => fn(row as unknown as RealtimeAlertPayload));
      }
      if (table === "notifications" && row) {
        const notification = row as unknown as RealtimeNotificationPayload;
        if (!notification.user_id || notification.user_id === authUserId) {
          notificationListenersRef.current.forEach((fn) => fn(notification));
        }
      }
      if (table === "orders" && row && typeof row.status === "string") {
        orderListenersRef.current.forEach((fn) => fn({ id: recordId ?? "", status: row.status as string }));
      }
      requestDebouncedRefresh(table === "orders" ? 350 : 650);
    };

    const channel = supabase
      .channel(channelName)
      // Postgres DELETE events are deliberately excluded: Supabase does not
      // apply RLS to delete payloads. Every streamed table is instead
      // filtered by the active restaurant and still checked by table RLS.
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts", filter: `restaurant_id=eq.${restaurantId}` }, (p) => handleChange("alerts", "INSERT", p))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "alerts", filter: `restaurant_id=eq.${restaurantId}` }, (p) => handleChange("alerts", "UPDATE", p))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `restaurant_id=eq.${restaurantId}` }, (p) => handleChange("notifications", "INSERT", p))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `restaurant_id=eq.${restaurantId}` }, (p) => handleChange("notifications", "UPDATE", p));

    for (const table of TENANT_TABLES) {
      if (table === "alerts" || table === "notifications") continue;
      channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table, filter: `restaurant_id=eq.${restaurantId}` }, (p) => handleChange(table, "INSERT", p))
        .on("postgres_changes", { event: "UPDATE", schema: "public", table, filter: `restaurant_id=eq.${restaurantId}` }, (p) => handleChange(table, "UPDATE", p));
    }

    const onOnline = () => markNetworkState();
    const onOffline = () => setConnectionState("offline");
    const onVisibility = () => {
      if (document.visibilityState === "visible") requestDebouncedRefresh(250);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibility);

    channel.subscribe((status) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") {
        setConnectionState("live");
        setLastEventAt(new Date().toISOString());
        requestDebouncedRefresh(300);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        markNetworkState();
      }
    });

    return () => {
      disposed = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [restaurantId, authUserId, requestDebouncedRefresh]);

  return (
    <RealtimeContext.Provider
      value={{
        restaurantId,
        connectionState: !restaurantId || !authUserId
          ? "idle"
          : connectionState === "idle"
            ? "connecting"
            : connectionState,
        lastEventAt,
        requestDebouncedRefresh,
        subscribeAlerts,
        subscribeNotifications,
        subscribeOrders,
        subscribeChanges,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

/** Hook to access the unified realtime bus context */
export function useRealtimeBus() {
  return useContext(RealtimeContext);
}

/** Hook to subscribe to live alert inserts across the restaurant */
export function useRealtimeAlertSubscription(onAlert: (alert: RealtimeAlertPayload) => void) {
  const { subscribeAlerts } = useRealtimeBus();
  useEffect(() => {
    return subscribeAlerts(onAlert);
  }, [subscribeAlerts, onAlert]);
}

/** Hook to subscribe to live notifications targeted for the current user */
export function useRealtimeNotificationSubscription(
  onNotification: (notification: RealtimeNotificationPayload) => void
) {
  const { subscribeNotifications } = useRealtimeBus();
  useEffect(() => {
    return subscribeNotifications(onNotification);
  }, [subscribeNotifications, onNotification]);
}

/** Hook for pages to declare that they depend on live KPI refresh */
export function useLiveKpiSubscription() {
  const { requestDebouncedRefresh } = useRealtimeBus();
  return { requestRefresh: requestDebouncedRefresh };
}
