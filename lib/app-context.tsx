"use client";

import { restaurants, currentRestaurantId } from "@/lib/mock-data";
import type { Role } from "@/lib/types";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Period = "jour" | "semaine" | "mois" | "custom";

type AppState = {
  role: Role;
  setRole: (r: Role) => void;
  restaurantId: string;
  setRestaurantId: (id: string) => void;
  period: Period;
  setPeriod: (p: Period) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("owner");
  const [restaurantId, setRestaurantId] = useState(currentRestaurantId);
  const [period, setPeriod] = useState<Period>("mois");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const value = useMemo(
    () => ({
      role,
      setRole,
      restaurantId,
      setRestaurantId,
      period,
      setPeriod,
      sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [role, restaurantId, period, sidebarCollapsed]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useCurrentRestaurant() {
  const { restaurantId } = useApp();
  return restaurants.find((r) => r.id === restaurantId) ?? restaurants[0];
}

export const roleLabels: Record<Role, string> = {
  owner: "Propriétaire",
  staff: "Staff",
  consultant: "Consultant",
};
