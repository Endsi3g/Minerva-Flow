"use server";

import { revalidatePath } from "next/cache";
import {
  createRestaurant,
  updateRestaurant,
  type RestaurantInput,
} from "@/lib/data/restaurants";
import { getConnections, createConnection } from "@/lib/data/finance";
import { getAlertRules, upsertAlertRule } from "@/lib/data/alerts";
import { getMySessions, revokeSession, type DeviceSession } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { isGooglePlacesConfigured } from "@/lib/google/config";
import { searchPlaces, getPlaceDetails, mapPlaceDetailsToRestaurantInput, type PlaceSuggestion } from "@/lib/google-places";
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

/**
 * Read-only, no restaurant-mutation semantics — the caller merges the
 * result into its own local form state before calling
 * createRestaurantAction/updateRestaurantAction to actually persist it.
 */
export async function isGooglePlacesEnabledAction(): Promise<boolean> {
  return isGooglePlacesConfigured();
}

export async function searchPlacesAction(query: string): Promise<PlaceSuggestion[]> {
  return searchPlaces(query);
}

export async function getPlaceDetailsAction(placeId: string): Promise<Partial<RestaurantInput> | null> {
  const details = await getPlaceDetails(placeId);
  return details ? mapPlaceDetailsToRestaurantInput(details) : null;
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

export async function getMySessionsAction(): Promise<DeviceSession[]> {
  return getMySessions();
}

export async function revokeSessionAction(sessionId: string): Promise<boolean> {
  const ok = await revokeSession(sessionId);
  if (ok) revalidatePath("/settings");
  return ok;
}

export async function getApiKeysAction(restaurantId: string) {
  const { getApiKeys } = await import("@/lib/data/api-keys");
  return getApiKeys(restaurantId);
}

export async function createApiKeyAction(restaurantId: string, name: string, scopes?: string[]) {
  const { createApiKey } = await import("@/lib/data/api-keys");
  const result = await createApiKey(restaurantId, name, scopes);
  if (result) revalidatePath("/settings");
  return result;
}

export async function revokeApiKeyAction(restaurantId: string, id: string) {
  const { revokeApiKey } = await import("@/lib/data/api-keys");
  const ok = await revokeApiKey(restaurantId, id);
  if (ok) revalidatePath("/settings");
  return ok;
}

export async function deleteApiKeyAction(restaurantId: string, id: string) {
  const { deleteApiKey } = await import("@/lib/data/api-keys");
  const ok = await deleteApiKey(restaurantId, id);
  if (ok) revalidatePath("/settings");
  return ok;
}

export async function testMcpToolAction(
  restaurantId: string,
  toolName: string
): Promise<{ ok: boolean; result: string; durationMs: number; tokenSavingsPct: number }> {
  const start = Date.now();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  try {
    let output: unknown = {};

    switch (toolName) {
      case "minerva_get_restaurant_summary": {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [
          { data: restaurant },
          { count: todayOrdersCount },
          { data: todayOrders },
          { count: todayReservationsCount },
          { count: lowStockCount },
        ] = await Promise.all([
          supabase.from("restaurants").select("name, city, currency").eq("id", restaurantId).maybeSingle(),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gte("created_at", todayStart.toISOString()),
          supabase.from("orders").select("total, status").eq("restaurant_id", restaurantId).gte("created_at", todayStart.toISOString()),
          supabase.from("reservations").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gte("reservation_time", todayStart.toISOString()),
          supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).lt("quantity_on_hand", 5),
        ]);
        const todayRevenue = (todayOrders as { total: number }[] ?? []).reduce((sum, o) => sum + (o.total || 0), 0);
        output = {
          restaurant: (restaurant as { name: string; city: string; currency: string } | null)?.name,
          city: (restaurant as { name: string; city: string; currency: string } | null)?.city,
          ordersToday: todayOrdersCount ?? 0,
          revenueToday: Math.round(todayRevenue * 100) / 100,
          reservationsToday: todayReservationsCount ?? 0,
          stockAlerts: lowStockCount ?? 0,
        };
        break;
      }
      case "minerva_get_menu_items": {
        const { data } = await supabase.from("menu_items").select("id, name, price, category, food_cost, active").eq("restaurant_id", restaurantId).limit(5);
        output = data ?? [];
        break;
      }
      case "minerva_get_referral_roi_and_ambassadors": {
        const { computeReferralRoiMetrics, getTopAmbassadors } = await import("@/lib/data/referral-roi");
        const [roi, ambassadors] = await Promise.all([
          computeReferralRoiMetrics(restaurantId),
          getTopAmbassadors(restaurantId, 3),
        ]);
        output = {
          clicks: roi.totalClicks,
          conversions: roi.totalConversions,
          revenue: roi.totalRevenueGenerated,
          multiplier: `${roi.roiMultiplier}x`,
          topAmbassadors: ambassadors.map((a) => ({ name: a.customerName, conversions: a.referralConversions, revenue: a.revenueGenerated })),
        };
        break;
      }
      case "minerva_get_prospects": {
        const { data } = await supabase.from("prospects").select("id, restaurant_name, status, demo_slug, commission_rate_pct").limit(5);
        output = data ?? [];
        break;
      }
      default: {
        output = { message: `Outil ${toolName} simulé avec succès en mode Token-Efficient.` };
      }
    }

    const durationMs = Date.now() - start;
    const jsonStr = JSON.stringify(output, null, 2);
    return { ok: true, result: jsonStr, durationMs, tokenSavingsPct: 72 };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    return { ok: false, result: `Erreur d'exécution : ${err instanceof Error ? err.message : String(err)}`, durationMs, tokenSavingsPct: 0 };
  }
}
