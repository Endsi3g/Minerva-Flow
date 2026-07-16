import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomers, getLoyaltyRewards } from "@/lib/data/customers";
import { getRestaurant } from "@/lib/data/restaurants";
import { FidelisationView } from "./FidelisationView";

export default async function FidelisationPage() {
  const restaurantId = await getCurrentRestaurantId();

  const [customers, rewards, restaurant] = restaurantId
    ? await Promise.all([
        getCustomers(restaurantId),
        getLoyaltyRewards(restaurantId),
        getRestaurant(restaurantId),
      ])
    : [[], [], null];

  return (
    <FidelisationView
      restaurantId={restaurantId}
      initialCustomers={customers}
      initialRewards={rewards}
      loyaltyPointsPerDollar={restaurant?.loyaltyPointsPerDollar ?? 1}
    />
  );
}
