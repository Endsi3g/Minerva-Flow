import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FeaturedMenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
};

export type PublicSiteShowcase = {
  restaurantId: string;
  restaurantName: string;
  isOpenNow: boolean;
  hoursNotice: string;
  activePromoTitle: string;
  activePromoText: string;
  activePromoBadge?: string;
  featuredMenuItems: FeaturedMenuItem[];
  updatedAt: string;
};

const DEFAULT_SHOWCASE: PublicSiteShowcase = {
  restaurantId: "default-rest-id",
  restaurantName: "Café & Bistro Minerva",
  isOpenNow: true,
  hoursNotice: "Ouvert aujourd'hui de 08:00 à 22:00",
  activePromoTitle: "Spécial Brunch du Dimanche",
  activePromoText: "Profitez de 15% de réduction sur la formule brunch ce week-end !",
  activePromoBadge: "Promotion Vedette",
  featuredMenuItems: [
    {
      id: "m-1",
      name: "Burger Gourmet Le Minerva",
      price: 21.5,
      category: "Plats Principaux",
      description: "Boeuf Angus, fromage cheddar vieilli 2 ans, bacon croustillant et sauce maison.",
    },
    {
      id: "m-2",
      name: "Tartare de Saumon Frais",
      price: 19.0,
      category: "Entrées & Crudos",
      description: "Saumon de l'Atlantique, échalotes, câpres, chips de taro faites maison.",
    },
    {
      id: "m-3",
      name: "Café Glacé Signature Caramel",
      price: 6.5,
      category: "Boissons",
      description: "Espresso double, lait d'avoine et sirop de caramel crémeux maison.",
    },
  ],
  updatedAt: new Date().toISOString(),
};

/**
 * Server-only: retrieves public site showcase data published from the Dashboard.
 */
export async function getPublicSiteShowcase(restaurantId?: string): Promise<PublicSiteShowcase> {
  try {
    const supabase = await createClient();
    let query = supabase.from("site_showcase_publications").select("*");
    
    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId);
    }
    
    const { data } = await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();

    if (!data) return DEFAULT_SHOWCASE;

    return {
      restaurantId: data.restaurant_id || DEFAULT_SHOWCASE.restaurantId,
      restaurantName: data.restaurant_name || DEFAULT_SHOWCASE.restaurantName,
      isOpenNow: Boolean(data.is_open_now),
      hoursNotice: data.hours_notice || DEFAULT_SHOWCASE.hoursNotice,
      activePromoTitle: data.active_promo_title || DEFAULT_SHOWCASE.activePromoTitle,
      activePromoText: data.active_promo_text || DEFAULT_SHOWCASE.activePromoText,
      activePromoBadge: data.active_promo_badge || DEFAULT_SHOWCASE.activePromoBadge,
      featuredMenuItems: (data.featured_menu_items as FeaturedMenuItem[]) || DEFAULT_SHOWCASE.featuredMenuItems,
      updatedAt: data.updated_at || DEFAULT_SHOWCASE.updatedAt,
    };
  } catch {
    return DEFAULT_SHOWCASE;
  }
}

/**
 * Server-only (service role): updates and publishes showcase data from Dashboard to the Public Site.
 */
export async function updatePublicSiteShowcase(
  restaurantId: string,
  patch: Partial<PublicSiteShowcase>
): Promise<PublicSiteShowcase | null> {
  const admin = createAdminClient();

  const updateRow: Record<string, any> = {
    restaurant_id: restaurantId,
    updated_at: new Date().toISOString(),
  };

  if (patch.isOpenNow !== undefined) updateRow.is_open_now = patch.isOpenNow;
  if (patch.hoursNotice !== undefined) updateRow.hours_notice = patch.hoursNotice;
  if (patch.activePromoTitle !== undefined) updateRow.active_promo_title = patch.activePromoTitle;
  if (patch.activePromoText !== undefined) updateRow.active_promo_text = patch.activePromoText;
  if (patch.activePromoBadge !== undefined) updateRow.active_promo_badge = patch.activePromoBadge;
  if (patch.featuredMenuItems !== undefined) updateRow.featured_menu_items = patch.featuredMenuItems;

  const { data, error } = await admin
    .from("site_showcase_publications")
    .upsert(updateRow, { onConflict: "restaurant_id" })
    .select("*")
    .single();

  if (error || !data) {
    // Fallback in-memory update for demonstration
    return {
      ...DEFAULT_SHOWCASE,
      ...patch,
      restaurantId,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    restaurantId: data.restaurant_id,
    restaurantName: data.restaurant_name || DEFAULT_SHOWCASE.restaurantName,
    isOpenNow: Boolean(data.is_open_now),
    hoursNotice: data.hours_notice || DEFAULT_SHOWCASE.hoursNotice,
    activePromoTitle: data.active_promo_title || DEFAULT_SHOWCASE.activePromoTitle,
    activePromoText: data.active_promo_text || DEFAULT_SHOWCASE.activePromoText,
    activePromoBadge: data.active_promo_badge || DEFAULT_SHOWCASE.activePromoBadge,
    featuredMenuItems: (data.featured_menu_items as FeaturedMenuItem[]) || DEFAULT_SHOWCASE.featuredMenuItems,
    updatedAt: data.updated_at,
  };
}
