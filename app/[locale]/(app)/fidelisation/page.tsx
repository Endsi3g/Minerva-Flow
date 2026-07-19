import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomers, getLoyaltyRewards } from "@/lib/data/customers";
import { getRestaurant } from "@/lib/data/restaurants";
import { getReferralPrograms } from "@/lib/data/referral-programs";
import { getReferralLinksForRestaurant } from "@/lib/data/customer-referrals";
import { FidelisationView } from "./FidelisationView";

export default async function FidelisationPage() {
  const restaurantId = await getCurrentRestaurantId();

  const [customers, rewards, restaurant, referralPrograms, referralLinks] = restaurantId
    ? await Promise.all([
        getCustomers(restaurantId),
        getLoyaltyRewards(restaurantId),
        getRestaurant(restaurantId),
        getReferralPrograms(restaurantId),
        getReferralLinksForRestaurant(restaurantId),
      ])
    : [[], [], null, [], []];

  return (
    <FidelisationView
      restaurantId={restaurantId}
      initialCustomers={customers}
      initialRewards={rewards}
      loyaltyPointsPerDollar={restaurant?.loyaltyPointsPerDollar ?? 1}
      initialReferralPrograms={referralPrograms}
      referralLinks={referralLinks}
    />
  );
}
