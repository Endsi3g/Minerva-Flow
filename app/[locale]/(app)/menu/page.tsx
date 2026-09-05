import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getMenuItems } from "@/lib/data/menu";
import { getRestaurant } from "@/lib/data/restaurants";
import { getMenuSharesForRestaurant } from "@/lib/data/menu-shares";
import { getOffersForRestaurant } from "@/lib/data/offers";
import { getInventoryItems } from "@/lib/data/inventory";
import { getRecipeItemsForMenuItems } from "@/lib/data/recipes";
import { isPlatformAdmin } from "@/lib/data/admin";
import { MenuView } from "./MenuView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("menu") };
}

export default async function MenuPage() {
  const restaurantId = await getCurrentRestaurantId();
  const isPlatformAdminUser = await isPlatformAdmin();

  const [items, restaurant, shares, offers, inventoryItems] = restaurantId
    ? await Promise.all([
        getMenuItems(restaurantId),
        getRestaurant(restaurantId),
        getMenuSharesForRestaurant(restaurantId),
        getOffersForRestaurant(restaurantId),
        getInventoryItems(restaurantId),
      ])
    : [[], null, [], [], []];

  const recipesByMenuItem = restaurantId
    ? await getRecipeItemsForMenuItems(
        restaurantId,
        items.map((i) => i.id)
      )
    : new Map();

  return (
    <MenuView
      restaurantId={restaurantId}
      initialItems={items}
      taxRate={restaurant?.taxRate ?? 0.14975}
      acceptsTips={restaurant?.acceptsTips ?? true}
      initialShares={shares}
      initialOffers={offers}
      inventoryItems={inventoryItems}
      initialRecipes={Object.fromEntries(recipesByMenuItem)}
      isPlatformAdminUser={isPlatformAdminUser}
    />
  );
}
