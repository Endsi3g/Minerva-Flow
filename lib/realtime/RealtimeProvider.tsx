"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

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

interface RealtimeContextValue {
  restaurantId: string | null;
  requestDebouncedRefresh: (delayMs?: number) => void;
  subscribeAlerts: (listener: AlertListener) => () => void;
  subscribeNotifications: (listener: NotificationListener) => () => void;
  subscribeOrders: (listener: OrderListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  restaurantId: null,
  requestDebouncedRefresh: () => {},
  subscribeAlerts: () => () => {},
  subscribeNotifications: () => () => {},
  subscribeOrders: () => () => {},
});

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
  const router = useRouter();

  const alertListenersRef = useRef<Set<AlertListener>>(new Set());
  const notificationListenersRef = useRef<Set<NotificationListener>>(new Set());
  const orderListenersRef = useRef<Set<OrderListener>>(new Set());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();
    const channelName = `restaurant-bus-${restaurantId}`;

    const channel = supabase
      .channel(channelName)
      // 1. Alerts stream
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
          const row = payload.new as unknown as RealtimeAlertPayload;
          if (row) {
            alertListenersRef.current.forEach((fn) => fn(row));
          }
        }
      )
      // 2. Notifications stream
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
          const row = payload.new as unknown as RealtimeNotificationPayload;
          if (row && (!row.user_id || row.user_id === authUser?.id)) {
            notificationListenersRef.current.forEach((fn) => fn(row));
          }
        }
      )
      // 3. Live KPI invalidation (Service Days)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_days",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          requestDebouncedRefresh(1000);
        }
      )
      // 4. Live KPI invalidation (Financial Transactions)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "financial_transactions",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          requestDebouncedRefresh(1000);
        }
      )
      // 5. Orders stream & live status changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
          const row = payload.new as unknown as { id: string; status: string } | null;
          if (row) {
            orderListenersRef.current.forEach((fn) => fn(row));
          }
          requestDebouncedRefresh(1500);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [restaurantId, authUser?.id, requestDebouncedRefresh]);

  return (
    <RealtimeContext.Provider
      value={{
        restaurantId,
        requestDebouncedRefresh,
        subscribeAlerts,
        subscribeNotifications,
        subscribeOrders,
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
