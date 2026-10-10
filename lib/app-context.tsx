"use client";

import type { Restaurant, Role } from "@/lib/types";
import type { WorkspaceBranding } from "@/lib/branding/workspace-branding";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

export type Period = "jour" | "semaine" | "mois" | "custom";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
};

type AppState = {
  role: Role;
  sidebarPermissions: string[] | null;
  isPlatformAdmin: boolean;
  restaurantId: string;
  setRestaurantId: (id: string) => void;
  restaurants: Restaurant[];
  workspaces: { id: string; name: string }[];
  branding: WorkspaceBranding | null;
  period: Period;
  setPeriod: (p: Period) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  authUser: AuthUser | null;
  updateAuthUser: (patch: Partial<AuthUser>) => void;
};

const AppContext = createContext<AppState | null>(null);

const SIDEBAR_KEY = "mv_sidebar_collapsed";
const sidebarListeners = new Set<() => void>();
let sidebarFallback = false;

function subscribeSidebar(listener: () => void) {
  sidebarListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    sidebarListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readSidebar(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return sidebarFallback;
  }
}

function writeSidebar(value: boolean) {
  sidebarFallback = value;
  try {
    window.localStorage.setItem(SIDEBAR_KEY, value ? "1" : "0");
  } catch {
    // Storage can be blocked; the toggle then lasts for this session.
  }
  sidebarListeners.forEach((listener) => listener());
}

export function AppProvider({
  children,
  authUser = null,
  role,
  sidebarPermissions = null,
  isPlatformAdmin = false,
  restaurants,
  workspaces = [],
  branding = null,
  initialRestaurantId,
}: {
  children: ReactNode;
  authUser?: AuthUser | null;
  role: Role;
  sidebarPermissions?: string[] | null;
  isPlatformAdmin?: boolean;
  restaurants: Restaurant[];
  workspaces?: { id: string; name: string }[];
  branding?: WorkspaceBranding | null;
  initialRestaurantId: string;
}) {
  const router = useRouter();
  const [restaurantId, setRestaurantIdState] = useState(initialRestaurantId);
  const [period, setPeriod] = useState<Period>("mois");
  // Remembered per computer so the desktop app reopens as it was left.
  const sidebarCollapsed = useSyncExternalStore(subscribeSidebar, readSidebar, () => false);
  const setSidebarCollapsed = useCallback((value: boolean) => writeSidebar(value), []);
  const [localAuthUser, setLocalAuthUser] = useState<AuthUser | null>(authUser);

  const setRestaurantId = useCallback((id: string) => {
    setRestaurantIdState(id);
    document.cookie = `mv_restaurant_id=${id}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  function updateAuthUser(patch: Partial<AuthUser>) {
    setLocalAuthUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  const value = useMemo(
    () => ({
      role,
      sidebarPermissions,
      isPlatformAdmin,
      restaurantId,
      setRestaurantId,
      restaurants,
      workspaces,
      branding,
      period,
      setPeriod,
      sidebarCollapsed,
      setSidebarCollapsed,
      authUser: localAuthUser,
      updateAuthUser,
    }),
    [role, sidebarPermissions, isPlatformAdmin, restaurantId, restaurants, workspaces, branding, period, sidebarCollapsed, setSidebarCollapsed, localAuthUser, setRestaurantId]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useCurrentRestaurant() {
  const { restaurantId, restaurants } = useApp();
  return restaurants.find((r) => r.id === restaurantId) ?? restaurants[0];
}

export const roleLabels: Record<Role, string> = {
  owner: "Propriétaire",
  manager: "Gérant",
  staff: "Staff",
  consultant: "Consultant",
};
