"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { isDemoAccount } from "@/lib/demo";
import type { Role } from "@/lib/types";

/**
 * Lets the permanent demo account preview the app as owner or staff to
 * check both sides — a real role change on the demo restaurant (not a
 * client-side fake), scoped defense-in-depth to the demo account's own
 * email even though the UI already only renders this for that account.
 * router.refresh() after this re-runs the server components (sidebar,
 * Overview) that branch on role.
 */
export async function switchDemoRoleAction(role: Extract<Role, "owner" | "staff">): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isDemoAccount(user.email)) return false;

  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return false;

  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurant_members")
    .update({ role })
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id);

  if (error) return false;
  revalidatePath("/", "layout");
  return true;
}
