"use client";

import type { Restaurant, Role } from "@/lib/types";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Period = "jour" | "semaine" | "mois" | "custom";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
};

type AppState = {
  role: Role;
  restaurantId: string;
  setRestaurantId: (id: string) => void;
  restaurants: Restaurant[];
  period: Period;
  setPeriod: (p: Period) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  authUser: AuthUser | null;
  updateAuthUser: (patch: Partial<AuthUser>) => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({
  children,
  authUser = null,
  role,
  restaurants,
  initialRestaurantId,
}: {
  children: ReactNode;
  authUser?: AuthUser | null;
  role: Role;
  restaurants: Restaurant[];
  initialRestaurantId: string;
}) {
  const router = useRouter();
  const [restaurantId, setRestaurantIdState] = useState(initialRestaurantId);
  const [period, setPeriod] = useState<Period>("mois");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [localAuthUser, setLocalAuthUser] = useState<AuthUser | null>(authUser);

  function setRestaurantId(id: string) {
    setRestaurantIdState(id);
    document.cookie = `mv_restaurant_id=${id}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  function updateAuthUser(patch: Partial<AuthUser>) {
    setLocalAuthUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  const value = useMemo(
    () => ({
      role,
      restaurantId,
      setRestaurantId,
      restaurants,
      period,
      setPeriod,
      sidebarCollapsed,
      setSidebarCollapsed,
      authUser: localAuthUser,
      updateAuthUser,
    }),
    [role, restaurantId, restaurants, period, sidebarCollapsed, localAuthUser]
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
