import { getRestaurantLibraryAssets } from "@/lib/data/library";
import { getCurrentRestaurant } from "@/lib/data/current-restaurant";
import { LibraryView } from "@/components/library/LibraryView";
import { redirect } from "next/navigation";

export default async function LibraryPage() {
  const restaurant = await getCurrentRestaurant();
  if (!restaurant) {
    redirect("/overview");
  }

  const assets = await getRestaurantLibraryAssets(restaurant.id);

  return <LibraryView initialAssets={assets} restaurantName={restaurant.name} />;
}
