import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getMenuPresentation } from "@/lib/data/menu-presentation";
import { DEFAULT_MENU_PRESENTATION } from "@/lib/types";
import { PresentationStudio } from "../PresentationStudio";

export default async function MenuDesignPage() {
  const restaurantId = await getCurrentRestaurantId();
  const initial = restaurantId ? await getMenuPresentation(restaurantId) : DEFAULT_MENU_PRESENTATION;
  return <PresentationStudio restaurantId={restaurantId} initial={initial} mode="design" />;
}
