"use server";

import { revalidatePath } from "next/cache";
import {
  createRestaurant,
  updateRestaurant,
  type RestaurantInput,
} from "@/lib/data/restaurants";
import { getConnections, createConnection } from "@/lib/data/finance";
import { getAlertRules, upsertAlertRule } from "@/lib/data/alerts";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";
import type {
  AlertRule,
  AlertRuleType,
  Connection,
  ConnectionType,
  Restaurant,
} from "@/lib/types";

export async function createRestaurantAction(input: RestaurantInput): Promise<Restaurant | null> {
  const restaurant = await createRestaurant(input);
  if (restaurant) {
    revalidatePath("/etablissement");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const posthog = getPostHogClient();
      posthog.capture({ distinctId: user.id, event: "restaurant_created", properties: { restaurant_id: restaurant.id } });
      await posthog.flush();
    }
  }
  return restaurant;
}

export async function updateRestaurantAction(
  id: string,
  patch: Partial<RestaurantInput>
): Promise<Restaurant | null> {
  const restaurant = await updateRestaurant(id, patch);
  if (restaurant) revalidatePath("/etablissement");
  return restaurant;
}

export async function getConnectionsAction(restaurantId: string): Promise<Connection[]> {
  return getConnections(restaurantId);
}

export async function createConnectionAction(
  restaurantId: string,
  input: { name: string; type: ConnectionType }
): Promise<Connection | null> {
  const connection = await createConnection(restaurantId, input);
  if (connection) revalidatePath("/settings");
  return connection;
}

export async function getAlertRulesAction(restaurantId: string): Promise<AlertRule[]> {
  return getAlertRules(restaurantId);
}

export async function upsertAlertRuleAction(
  restaurantId: string,
  type: AlertRuleType,
  patch: { threshold?: number; enabled?: boolean; notify?: boolean }
): Promise<AlertRule | null> {
  const rule = await upsertAlertRule(restaurantId, type, patch);
  if (rule) revalidatePath("/settings");
  return rule;
}
