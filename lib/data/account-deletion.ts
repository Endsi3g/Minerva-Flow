import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Self-serve account deletion (Loi 25 — right to erasure). Blocks when the
 * user is the sole active owner of a restaurant: deleting them would orphan
 * every collaborator and every row of that restaurant's data, which needs
 * a human (ownership transfer or assisted deletion), not a silent cascade.
 */
export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Vous devez être connecté." };
  return deleteAccountForUser(user.id, user.email ?? null);
}

/** Restaurants for which this user is an active owner and nobody else is. */
export function soleOwnedRestaurantIds(
  ownedRestaurantIds: string[],
  otherOwnerRestaurantIds: string[]
): string[] {
  const covered = new Set(otherOwnerRestaurantIds);
  return ownedRestaurantIds.filter((id) => !covered.has(id));
}

/**
 * Same erasure for a caller already identified by id: the cookie-based web
 * action above and the Bearer-token route the native owner app uses both end
 * here, so the sole-owner protection can never differ between the two.
 */
export async function deleteAccountForUser(
  userId: string,
  knownEmail: string | null
): Promise<DeleteAccountResult> {
  const admin = createAdminClient();

  const { data: ownedMemberships } = await admin
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .eq("status", "active");

  const ownedRestaurantIds = ((ownedMemberships as { restaurant_id: string }[]) ?? []).map(
    (m) => m.restaurant_id
  );

  if (ownedRestaurantIds.length > 0) {
    const { data: otherOwners } = await admin
      .from("restaurant_members")
      .select("restaurant_id")
      .in("restaurant_id", ownedRestaurantIds)
      .eq("role", "owner")
      .eq("status", "active")
      .neq("user_id", userId);

    const soleOwnerOf = soleOwnedRestaurantIds(
      ownedRestaurantIds,
      ((otherOwners as { restaurant_id: string }[]) ?? []).map((m) => m.restaurant_id)
    );

    if (soleOwnerOf.length > 0) {
      return {
        ok: false,
        error:
          "Vous êtes le seul propriétaire d'au moins un établissement. Transférez la propriété à un autre collaborateur, ou contactez le support pour une suppression assistée.",
      };
    }
  }

  let email = knownEmail;
  if (!email) {
    const { data } = await admin.auth.admin.getUserById(userId);
    email = data?.user?.email ?? null;
  }
  await admin.from("account_deletion_log").insert({
    user_email: email ?? "—",
    reason: "self_serve",
  });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: "La suppression a échoué. Réessayez ou contactez le support." };

  return { ok: true };
}
