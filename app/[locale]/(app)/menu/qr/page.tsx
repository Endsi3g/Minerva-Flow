import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getMenuSharesForRestaurant } from "@/lib/data/menu-shares";
import { getRestaurant } from "@/lib/data/restaurants";
import { MenuQrStudio } from "../MenuQrStudio";

export default async function MenuQrPage() {
  const restaurantId = await getCurrentRestaurantId();
  const [initialShares, restaurant] = restaurantId
    ? await Promise.all([getMenuSharesForRestaurant(restaurantId), getRestaurant(restaurantId)])
    : [[], null];
  return <MenuQrStudio restaurantId={restaurantId} restaurantName={restaurant?.name ?? null} initialShares={initialShares} />;
}
