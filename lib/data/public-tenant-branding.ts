import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The native customer app needs a small, public-safe slice of workspace
 * branding. Keep this allowlist separate from workspace_brand_settings so
 * sender, domain, module, and other owner configuration never leaves the
 * server. The caller must already have resolved an authenticated app user.
 */
export type PublicTenantBranding = {
  restaurantId: string;
  workspaceId: string | null;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

const DEFAULTS = {
  primaryColor: "#167F5B",
  secondaryColor: "#0E5A40",
  accentColor: "#DFFF5F",
};

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
}

export async function getPublicTenantBranding(restaurantId: string): Promise<PublicTenantBranding | null> {
  const admin = createAdminClient();
  const { data: restaurant, error } = await admin
    .from("restaurants")
    .select("id, name, workspace_id, color, workspace:workspaces(logo_url)")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error || !restaurant) return null;

  const workspaceId = restaurant.workspace_id as string | null;
  const workspaceRelation = restaurant.workspace as unknown as
    | { logo_url: string | null }
    | { logo_url: string | null }[]
    | null;
  const workspace = Array.isArray(workspaceRelation) ? workspaceRelation[0] : workspaceRelation;
  if (!workspaceId) {
    return {
      restaurantId,
      workspaceId: null,
      brandName: restaurant.name as string,
      logoUrl: workspace?.logo_url ?? null,
      primaryColor: safeColor(restaurant.color, DEFAULTS.primaryColor),
      secondaryColor: DEFAULTS.secondaryColor,
      accentColor: DEFAULTS.accentColor,
    };
  }

  const { data: brand } = await admin
    .from("workspace_brand_settings")
    .select("brand_name, logo_url, primary_color, secondary_color, accent_color")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return {
    restaurantId,
    workspaceId,
    brandName: (brand?.brand_name as string | undefined) || (restaurant.name as string),
    logoUrl: (brand?.logo_url as string | null | undefined) ?? workspace?.logo_url ?? null,
    primaryColor: safeColor(brand?.primary_color, DEFAULTS.primaryColor),
    secondaryColor: safeColor(brand?.secondary_color, DEFAULTS.secondaryColor),
    accentColor: safeColor(brand?.accent_color, DEFAULTS.accentColor),
  };
}
