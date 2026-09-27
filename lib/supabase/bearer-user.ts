import { createAdminClient } from "@/lib/supabase/admin";

export type NativeOwnerContext = {
  userId: string;
  restaurantId: string;
};

/** Validates the app's real Supabase bearer session and tenant role for native API calls. */
export async function getNativeOwnerContext(
  request: Request,
  requestedRestaurantId: string | null
): Promise<{ context: NativeOwnerContext } | { error: string; status: number }> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: "Authentification requise.", status: 401 };
  if (!requestedRestaurantId) return { error: "Restaurant manquant.", status: 400 };

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) return { error: "Session invalide ou expirée.", status: 401 };

  const { data: membership, error: membershipError } = await admin
    .from("restaurant_members")
    .select("role, status")
    .eq("restaurant_id", requestedRestaurantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (membershipError || !membership) return { error: "Aucun accès à cet espace.", status: 403 };
  if (membership.status !== "active") return { error: "Aucun accès à cet espace.", status: 403 };
  if (!["owner", "manager"].includes(membership.role)) return { error: "Accès réservé à l’équipe de gestion.", status: 403 };

  return { context: { userId: user.id, restaurantId: requestedRestaurantId } };
}
