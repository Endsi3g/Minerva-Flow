import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Phase 3 of the pricing-tier pivot (via /grill-me): the open,
 * cross-restaurant marketplace discovery built earlier is gated to
 * 'croissance'/'marque_blanche' — 'essentiel' ($99/mo) customers only ever
 * see their own franchise's other locations (same workspace_id, which
 * already models "same owner/company" in this schema — see
 * getWorkspaceRestaurants). Nothing gets deleted: the open-marketplace
 * code path stays, just gated behind this scope check instead of always
 * running.
 */
export type DiscoveryScope =
  | { mode: "open" }
  | { mode: "workspace"; workspaceId: string }
  | { mode: "single"; restaurantId: string }
  | { mode: "none" };

/**
 * A user with no customer row anywhere (never joined a restaurant yet)
 * gets `{ mode: "none" }` rather than the open marketplace — this pivot's
 * acquisition model is QR-first (scan a specific restaurant's printed
 * code, see the Studio QR & Affiches fix), not organic cross-restaurant
 * browsing before ever joining anywhere.
 */
export async function resolveDiscoveryScope(userId: string): Promise<DiscoveryScope> {
  const admin = createAdminClient();
  const { data: customerRow } = await admin
    .from("customers")
    .select("restaurant_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!customerRow) return { mode: "none" };

  const { data: restaurantRow } = await admin
    .from("restaurants")
    .select("workspace_id, plan_tier")
    .eq("id", customerRow.restaurant_id as string)
    .maybeSingle();

  if (!restaurantRow) return { mode: "none" };

  const tier = (restaurantRow.plan_tier as string) ?? "essentiel";
  if (tier !== "essentiel") return { mode: "open" };

  const workspaceId = restaurantRow.workspace_id as string | null;
  if (workspaceId) return { mode: "workspace", workspaceId };
  // No workspace on file for this restaurant (a handful of demo/orphaned
  // rows predate the workspace model) — "same franchise" has no other
  // members to include, so scope to just this one restaurant rather than
  // silently falling back to the open marketplace.
  return { mode: "single", restaurantId: customerRow.restaurant_id as string };
}
