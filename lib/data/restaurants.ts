import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/data/activity";
import { geocodeAddress } from "@/lib/geocode";
import type { Restaurant } from "@/lib/types";

type RestaurantRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  timezone: string;
  currency: string;
  service_model: string;
  operating_days: number[] | null;
  color: string | null;
  lng: number | null;
  lat: number | null;
  workspace_id: string | null;
  loyalty_points_per_dollar: number;
  tax_rate: number;
  accepts_tips: boolean;
};

function mapRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    city: row.city ?? "",
    province: row.province ?? "QC",
    postalCode: row.postal_code,
    timezone: row.timezone,
    currency: row.currency,
    serviceModel: row.service_model,
    operatingDays: row.operating_days ?? [],
    color: row.color ?? "var(--mv-green)",
    lng: row.lng,
    lat: row.lat,
    workspaceId: row.workspace_id,
    loyaltyPointsPerDollar: row.loyalty_points_per_dollar ?? 1,
    taxRate: row.tax_rate ?? 0.14975,
    acceptsTips: row.accepts_tips ?? true,
  };
}

/**
 * Restaurants the current authenticated user is an active member of,
 * via restaurant_members. Returns an empty array if not signed in.
 */
export async function getUserRestaurants(): Promise<Restaurant[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("restaurant_members")
    .select("restaurant:restaurants(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error || !data) return [];

  return data
    .map((row) => row.restaurant as unknown as RestaurantRow | null)
    .filter((r): r is RestaurantRow => Boolean(r))
    .map(mapRestaurant);
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRestaurant(data as RestaurantRow);
}

/**
 * Signup (email/password or OAuth) always provisions a default "Mon
 * restaurant" via handle_new_user(), unless raw_user_meta_data carries an
 * invite_token/workspace_invite_token flag — which only the email/password
 * path can set (OAuth carries no custom metadata). So an employee invited
 * via Google/Apple/Azure still ends up owning an empty default restaurant
 * alongside the one(s) they just joined. Called from both redemption flows
 * (lib/data/invites.ts and lib/data/workspace-invites.ts) as a safety net:
 * only ever deletes a restaurant named exactly "Mon restaurant" where this
 * user is the sole member and no business data exists on it yet.
 */
export async function deletePhantomDefaultRestaurant(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  excludeRestaurantIds: string[]
): Promise<void> {
  const { data: ownedMemberships } = await admin
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .not("restaurant_id", "in", `(${excludeRestaurantIds.join(",") || "00000000-0000-0000-0000-000000000000"})`);

  for (const membership of ownedMemberships ?? []) {
    const restaurantId = membership.restaurant_id as string;

    const [{ data: restaurant }, { count: memberCount }] = await Promise.all([
      admin.from("restaurants").select("id, name").eq("id", restaurantId).maybeSingle(),
      admin
        .from("restaurant_members")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
    ]);
    if (!restaurant || restaurant.name !== "Mon restaurant" || memberCount !== 1) continue;

    const [menuItems, employees, customers, serviceDays] = await Promise.all([
      admin.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
      admin.from("employees").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
      admin.from("customers").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
      admin.from("service_days").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
    ]);
    const isEmpty =
      (menuItems.count ?? 0) === 0 &&
      (employees.count ?? 0) === 0 &&
      (customers.count ?? 0) === 0 &&
      (serviceDays.count ?? 0) === 0;
    if (!isEmpty) continue;

    await admin.from("restaurants").delete().eq("id", restaurantId);
  }
}

export type RestaurantInput = {
  name: string;
  address?: string;
  city?: string;
  province?: string;
  timezone?: string;
  color?: string;
  loyaltyPointsPerDollar?: number;
  taxRate?: number;
  acceptsTips?: boolean;
};

/**
 * Creates a restaurant and immediately makes the current user its owner.
 * The restaurants insert relies on the "restaurants_owner_insert" policy
 * (with check (true)) in 0001_init.sql, which explicitly defers ownership
 * enforcement to this server-side flow inserting the membership row right
 * after.
 */
export async function createRestaurant(input: RestaurantInput): Promise<Restaurant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !input.name.trim()) return null;

  const coords = input.address && input.city ? await geocodeAddress(input.address, input.city, input.province) : null;

  // A new establishment joins the creator's CURRENT workspace context
  // automatically (the restaurant they had selected when clicking "add
  // establishment") — not an arbitrary one picked from everywhere they
  // happen to be an owner, which could attach it to the wrong workspace for
  // an owner spanning multiple. Falls back to workspace-less if there's no
  // current selection or that restaurant has no workspace yet.
  const cookieStore = await cookies();
  const currentRestaurantId = cookieStore.get("mv_restaurant_id")?.value;
  let workspaceId: string | null = null;
  if (currentRestaurantId) {
    const { data: currentMembership } = await supabase
      .from("restaurant_members")
      .select("restaurant:restaurants(workspace_id)")
      .eq("restaurant_id", currentRestaurantId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    workspaceId =
      (currentMembership as { restaurant: { workspace_id: string | null } | null } | null)?.restaurant
        ?.workspace_id ?? null;
  }

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name: input.name.trim(),
      address: input.address || null,
      city: input.city || null,
      province: input.province || undefined,
      timezone: input.timezone || undefined,
      color: input.color || undefined,
      lng: coords?.lng ?? null,
      lat: coords?.lat ?? null,
      workspace_id: workspaceId,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  const { error: memberError } = await supabase.from("restaurant_members").insert({
    restaurant_id: data.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  if (memberError) return null;

  await logActivity({
    restaurantId: data.id,
    actionType: "restaurant.create",
    entityType: "restaurant",
    entityId: data.id,
    description: `A ajouté l'établissement "${data.name}"`,
  });

  return mapRestaurant(data as RestaurantRow);
}

export async function updateRestaurant(
  id: string,
  patch: Partial<RestaurantInput>
): Promise<Restaurant | null> {
  const supabase = await createClient();

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.address !== undefined) dbPatch.address = patch.address;
  if (patch.city !== undefined) dbPatch.city = patch.city;
  if (patch.province !== undefined) dbPatch.province = patch.province;
  if (patch.timezone !== undefined) dbPatch.timezone = patch.timezone;
  if (patch.color !== undefined) dbPatch.color = patch.color;
  if (patch.loyaltyPointsPerDollar !== undefined) dbPatch.loyalty_points_per_dollar = patch.loyaltyPointsPerDollar;
  if (patch.taxRate !== undefined) dbPatch.tax_rate = patch.taxRate;
  if (patch.acceptsTips !== undefined) dbPatch.accepts_tips = patch.acceptsTips;

  // Re-geocode whenever the address changed — this is the only place a
  // restaurant's map pin (lng/lat) gets populated.
  if ((patch.address !== undefined || patch.city !== undefined) && patch.address && patch.city) {
    const coords = await geocodeAddress(patch.address, patch.city, patch.province);
    if (coords) {
      dbPatch.lng = coords.lng;
      dbPatch.lat = coords.lat;
    }
  }

  const { data, error } = await supabase
    .from("restaurants")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;

  await logActivity({
    restaurantId: id,
    actionType: "restaurant.update",
    entityType: "restaurant",
    entityId: id,
    description: `A modifié l'établissement "${data.name}"`,
  });

  return mapRestaurant(data as RestaurantRow);
}

/**
 * Lazily geocodes a restaurant that has an address but no pin yet — covers
 * restaurants created/edited before geocoding existed, without requiring
 * the owner to re-save Workspace. Called from the Maps page on load.
 */
export async function geocodeRestaurantIfMissing(restaurantId: string): Promise<{ lng: number; lat: number } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("address, city, province, lng, lat")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!data || data.lng !== null || data.lat !== null || !data.address || !data.city) return null;

  const coords = await geocodeAddress(data.address, data.city, data.province);
  if (!coords) return null;

  await supabase.from("restaurants").update({ lng: coords.lng, lat: coords.lat }).eq("id", restaurantId);
  return coords;
}
