import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getMenuItems } from "@/lib/data/menu";
import { getRestaurant } from "@/lib/data/restaurants";
import { getMenuSharesForRestaurant } from "@/lib/data/menu-shares";
import { MenuView } from "./MenuView";

export default async function MenuPage() {
  const restaurantId = await getCurrentRestaurantId();

  const [items, restaurant, shares] = restaurantId
    ? await Promise.all([
        getMenuItems(restaurantId),
        getRestaurant(restaurantId),
        getMenuSharesForRestaurant(restaurantId),
      ])
    : [[], null, []];

  return (
    <MenuView
      restaurantId={restaurantId}
      initialItems={items}
      taxRate={restaurant?.taxRate ?? 0.14975}
      acceptsTips={restaurant?.acceptsTips ?? true}
      initialShares={shares}
    />
  );
}
