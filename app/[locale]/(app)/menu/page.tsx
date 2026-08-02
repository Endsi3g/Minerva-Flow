import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getMenuItems } from "@/lib/data/menu";
import { getRestaurant } from "@/lib/data/restaurants";
import { getMenuSharesForRestaurant } from "@/lib/data/menu-shares";
import { getOffersForRestaurant } from "@/lib/data/offers";
import { getInventoryItems } from "@/lib/data/inventory";
import { getRecipeItemsForMenuItems } from "@/lib/data/recipes";
import { MenuView } from "./MenuView";

export default async function MenuPage() {
  const restaurantId = await getCurrentRestaurantId();

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
    />
  );
}
