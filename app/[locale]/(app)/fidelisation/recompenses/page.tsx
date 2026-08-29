import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getLoyaltyRewards } from "@/lib/data/customers";
import { RecompensesView } from "./RecompensesView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Récompenses — Fidélisation" };
}

export default async function RecompensesPage() {
  const restaurantId = await getCurrentRestaurantId();
  const [restaurant, rewards] = restaurantId
    ? await Promise.all([getRestaurant(restaurantId), getLoyaltyRewards(restaurantId)])
    : [null, []];

  return (
    <RecompensesView
      restaurantId={restaurantId}
      initialEnabled={restaurant?.visitRewardsEnabled ?? false}
      initialTiers={restaurant?.visitRewardTiers ?? []}
      initialRewards={rewards}
    />
  );
}
