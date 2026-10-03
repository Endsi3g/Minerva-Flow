import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Phase 3 of the pricing-tier pivot (via /grill-me): the open,
 * cross-restaurant marketplace discovery built earlier is gated to
 * 'croissance'/'marque_blanche' — 'essentiel' (150 CAD/mo) customers only ever
 * see their own franchise's other locations (same workspace_id, which
 * already models "same owner/company" in this schema — see
 * getWorkspaceRestaurants). Nothing gets deleted: the open-marketplace
 * code path stays, just gated behind this scope check instead of always
 * running.
 */
export type DiscoveryScope =
  | { mode: "open"; viewerIsDemo: boolean }
  | { mode: "workspace"; workspaceId: string; viewerIsDemo: boolean }
  | { mode: "single"; restaurantId: string; viewerIsDemo: boolean }
  | { mode: "none" };

/**
 * How a discovery query is narrowed, as PostgREST pieces the caller applies:
 *  - `or`: an OR-expression the row must match (null = no narrowing);
 *  - `excludeDemo`: drop restaurants flagged is_demo.
 *
 * Visibility rules:
 *  - A restaurant on a paid marketplace tier (croissance / marque_blanche)
 *    is listed for everyone: that exposure is part of the plan.
 *  - An essentiel viewer also sees their own franchise (workspace) or own
 *    restaurant, as before.
 *  - Demo restaurants are only ever shown to demo accounts, so no real
 *    customer sees a fictional restaurant on their map.
 *  - A demo account sees every demo restaurant plus the real promoted ones,
 *    so the demo shows the app as a customer really sees it.
 */
export type DiscoveryFilter = { or: string | null; excludeDemo: boolean };

export function discoveryFilter(scope: Exclude<DiscoveryScope, { mode: "none" }>): DiscoveryFilter {
  const promoted = "plan_tier.neq.essentiel";
  if (scope.viewerIsDemo) {
    return { or: scope.mode === "open" ? null : `is_demo.eq.true,${promoted}`, excludeDemo: false };
  }
  switch (scope.mode) {
    case "open":
      return { or: null, excludeDemo: true };
    case "workspace":
      return { or: `workspace_id.eq.${scope.workspaceId},${promoted}`, excludeDemo: true };
    case "single":
      return { or: `id.eq.${scope.restaurantId},${promoted}`, excludeDemo: true };
  }
}

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
    // Oldest membership = the "home" restaurant (same rule the native app's
    // loadPortalData uses). Without an ORDER BY, a customer with several
    // memberships got whichever row Postgres returned first, so their map
    // scope could flip between the open marketplace and a single location.
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!customerRow) return { mode: "none" };

  const { data: restaurantRow } = await admin
    .from("restaurants")
    .select("workspace_id, plan_tier, is_demo")
    .eq("id", customerRow.restaurant_id as string)
    .maybeSingle();

  if (!restaurantRow) return { mode: "none" };

  const viewerIsDemo = Boolean(restaurantRow.is_demo);
  const tier = (restaurantRow.plan_tier as string) ?? "essentiel";
  if (tier !== "essentiel") return { mode: "open", viewerIsDemo };

  const workspaceId = restaurantRow.workspace_id as string | null;
  if (workspaceId) return { mode: "workspace", workspaceId, viewerIsDemo };
  // No workspace on file for this restaurant (a handful of demo/orphaned
  // rows predate the workspace model) — "same franchise" has no other
  // members to include, so scope to just this one restaurant rather than
  // silently falling back to the open marketplace.
  return { mode: "single", restaurantId: customerRow.restaurant_id as string, viewerIsDemo };
}
