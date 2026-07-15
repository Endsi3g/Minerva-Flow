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

  const { data: ownedMemberships } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .eq("status", "active");

  const ownedRestaurantIds = ((ownedMemberships as { restaurant_id: string }[]) ?? []).map(
    (m) => m.restaurant_id
  );

  if (ownedRestaurantIds.length > 0) {
    const admin = createAdminClient();
    const { data: otherOwners } = await admin
      .from("restaurant_members")
      .select("restaurant_id")
      .in("restaurant_id", ownedRestaurantIds)
      .eq("role", "owner")
      .eq("status", "active")
      .neq("user_id", user.id);

    const restaurantsWithOtherOwner = new Set(
      ((otherOwners as { restaurant_id: string }[]) ?? []).map((m) => m.restaurant_id)
    );
    const soleOwnerOf = ownedRestaurantIds.filter((id) => !restaurantsWithOtherOwner.has(id));

    if (soleOwnerOf.length > 0) {
      return {
        ok: false,
        error:
          "Vous êtes le seul propriétaire d'au moins un établissement. Transférez la propriété à un autre collaborateur, ou contactez le support pour une suppression assistée.",
      };
    }
  }

  const admin = createAdminClient();
  await admin.from("account_deletion_log").insert({
    user_email: user.email ?? "—",
    reason: "self_serve",
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: "La suppression a échoué. Réessayez ou contactez le support." };

  return { ok: true };
}
