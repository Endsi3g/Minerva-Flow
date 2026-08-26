import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { RecompensesView } from "./RecompensesView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Récompenses par palier de visite" };
}

export default async function RecompensesPage() {
  const restaurantId = await getCurrentRestaurantId();
  const restaurant = restaurantId ? await getRestaurant(restaurantId) : null;

  return (
    <RecompensesView
      restaurantId={restaurantId}
      initialEnabled={restaurant?.visitRewardsEnabled ?? false}
      initialTiers={restaurant?.visitRewardTiers ?? []}
    />
  );
}
