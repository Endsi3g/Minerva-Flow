import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { ParametresView } from "./ParametresView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Paramètres — Fidélisation" };
}

export default async function ParametresPage() {
  const restaurantId = await getCurrentRestaurantId();
  const restaurant = restaurantId ? await getRestaurant(restaurantId) : null;

  return (
    <ParametresView
      restaurantId={restaurantId}
      loyaltyPointsPerDollar={restaurant?.loyaltyPointsPerDollar ?? 1}
      loyaltyTierThresholds={{
        tier2: restaurant?.loyaltyTier2Threshold ?? 150,
        tier3: restaurant?.loyaltyTier3Threshold ?? 400,
      }}
      retentionEngineEnabled={restaurant?.retentionEngineEnabled ?? false}
      retentionInactivityDays={restaurant?.retentionInactivityDays ?? 21}
    />
  );
}
