import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/data/activity";
import { notifyRestaurant } from "@/lib/data/notifications";
import type { Role } from "@/lib/types";

const INVITE_TTL_DAYS = 7;

export type RestaurantInvite = {
  id: string;
  restaurantId: string;
  role: Role;
  token: string;
  expiresAt: string;
};

type InviteRow = {
  id: string;
  restaurant_id: string;
  role: Role;
  token: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
};

function mapInvite(row: InviteRow): RestaurantInvite {
  return { id: row.id, restaurantId: row.restaurant_id, role: row.role, token: row.token, expiresAt: row.expires_at };
}

/**
 * Generates a redeemable invite link. Runs through the admin client (like
 * the existing email-invite route) because the eventual redeemer may not
 * have an account yet, so the write can't rely on is_restaurant_member().
 * The caller (a server action) is responsible for checking that the actor
 * is owner/manager before calling this.
 */
export async function createInviteLink(restaurantId: string, role: Role): Promise<RestaurantInvite | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const token = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurant_invites")
    .insert({ restaurant_id: restaurantId, role, token, created_by: user.id, expires_at: expiresAt })
    .select()
    .single();
  if (error || !data) return null;

  await logActivity({
    restaurantId,
    actionType: "invite.create_link",
    description: `A généré un lien d'invitation (${role}).`,
  });

  return mapInvite(data as InviteRow);
}

export type InviteLookup = {
  restaurantId: string;
  restaurantName: string;
  role: Role;
  status: "valid" | "expired" | "used" | "not_found";
};

export async function getInviteByToken(token: string): Promise<InviteLookup> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurant_invites")
    .select("restaurant_id, role, expires_at, used_at, restaurants(name)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return { restaurantId: "", restaurantName: "", role: "staff", status: "not_found" };

  const restaurant = data.restaurants as unknown as { name: string } | null;
  const status: InviteLookup["status"] = data.used_at
    ? "used"
    : new Date(data.expires_at) <= new Date()
      ? "expired"
      : "valid";

  return {
    restaurantId: data.restaurant_id,
    restaurantName: restaurant?.name ?? "",
    role: data.role as Role,
    status,
  };
}

/**
 * Redeems an invite for the currently authenticated user: upserts an
 * active restaurant_members row and marks the invite as used. Both writes
 * go through the admin client since the redeemer has no membership yet to
 * pass is_restaurant_member() on the normal RLS-scoped path.
 */
export async function redeemInvite(token: string): Promise<{ ok: boolean; restaurantId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("restaurant_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error || !invite) return { ok: false };
  if (invite.used_at || new Date(invite.expires_at) <= new Date()) return { ok: false };

  const { error: memberError } = await admin
    .from("restaurant_members")
    .upsert(
      { restaurant_id: invite.restaurant_id, user_id: user.id, role: invite.role, status: "active" },
      { onConflict: "restaurant_id,user_id" }
    );
  if (memberError) return { ok: false };

  await admin
    .from("restaurant_invites")
    .update({ used_at: new Date().toISOString(), used_by: user.id })
    .eq("id", invite.id);

  await logActivity({
    restaurantId: invite.restaurant_id,
    actionType: "invite.redeem",
    description: "A rejoint via un lien d'invitation.",
  });

  await notifyRestaurant({
    restaurantId: invite.restaurant_id,
    type: "invite.accepted",
    title: "Nouveau collaborateur",
    body: `${user.email ?? "Un utilisateur"} a rejoint l'établissement.`,
    link: "/collaborateurs",
    excludeUserId: user.id,
  });

  return { ok: true, restaurantId: invite.restaurant_id };
}
