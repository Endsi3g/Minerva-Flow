import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getMenuItems } from "@/lib/data/menu";
import { MenuView } from "./MenuView";

export default async function MenuPage() {
  const restaurantId = await getCurrentRestaurantId();
  const items = restaurantId ? await getMenuItems(restaurantId) : [];

  return <MenuView restaurantId={restaurantId} initialItems={items} />;
}
