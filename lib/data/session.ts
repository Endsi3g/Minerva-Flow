import { createClient } from "@/lib/supabase/server";
import { getUserRestaurants } from "@/lib/data/restaurants";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { isPlatformAdmin } from "@/lib/data/admin";
import { getVerifiedUser } from "@/lib/supabase/auth-user";
import type { AuthUser } from "@/lib/app-context";
import type { Restaurant, Role } from "@/lib/types";

export type AppSessionData = {
  authUser: AuthUser | null;
  restaurants: Restaurant[];
  role: Role;
  sidebarPermissions: string[] | null;
  initialRestaurantId: string;
  onboardingCompleted: boolean;
  isPlatformAdmin: boolean;
};

/**
 * Shared session bootstrap for every route group that mounts AppProvider
 * (app/(app)/layout.tsx and app/(chat)/layout.tsx) — keeps the two from
 * drifting apart on how authUser/role/restaurants are resolved.
 */
export async function getAppSessionData(): Promise<AppSessionData> {
  const supabase = await createClient();
  const user = await getVerifiedUser(supabase);

  const authUser: AuthUser | null = user
    ? {
        id: user.id,
        email: user.email ?? "",
        fullName: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "",
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }
    : null;

  const [restaurants, membership, onboardingCompleted, platformAdmin] = await Promise.all([
    getUserRestaurants(),
    getCurrentMembership(),
    user
      ? supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => (data as { onboarding_completed: boolean } | null)?.onboarding_completed ?? true)
      : Promise.resolve(true),
    user ? isPlatformAdmin() : Promise.resolve(false),
  ]);

  return {
    authUser,
    restaurants,
    role: membership?.role ?? "staff",
    sidebarPermissions: membership?.sidebarPermissions ?? null,
    initialRestaurantId: membership?.restaurantId ?? restaurants[0]?.id ?? "",
    onboardingCompleted,
    isPlatformAdmin: platformAdmin,
  };
}
