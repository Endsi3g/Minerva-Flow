import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomers, getLoyaltyRewards } from "@/lib/data/customers";
import { getRestaurant } from "@/lib/data/restaurants";
import { getReferralPrograms } from "@/lib/data/referral-programs";
import { getReferralLinksForRestaurant } from "@/lib/data/customer-referrals";
import { getLoyaltySharesForRestaurant } from "@/lib/data/loyalty-shares";
import { FidelisationView } from "./FidelisationView";

export default async function FidelisationPage() {
  const restaurantId = await getCurrentRestaurantId();

  const [customers, rewards, restaurant, referralPrograms, referralLinks, loyaltyShares] = restaurantId
    ? await Promise.all([
        getCustomers(restaurantId),
        getLoyaltyRewards(restaurantId),
        getRestaurant(restaurantId),
        getReferralPrograms(restaurantId),
        getReferralLinksForRestaurant(restaurantId),
        getLoyaltySharesForRestaurant(restaurantId),
      ])
    : [[], [], null, [], [], []];

  return (
    <FidelisationView
      restaurantId={restaurantId}
      initialCustomers={customers}
      initialRewards={rewards}
      loyaltyPointsPerDollar={restaurant?.loyaltyPointsPerDollar ?? 1}
      retentionEngineEnabled={restaurant?.retentionEngineEnabled ?? false}
      retentionInactivityDays={restaurant?.retentionInactivityDays ?? 21}
      loyaltyTierThresholds={{
        tier2: restaurant?.loyaltyTier2Threshold ?? 150,
        tier3: restaurant?.loyaltyTier3Threshold ?? 400,
      }}
      initialReferralPrograms={referralPrograms}
      referralLinks={referralLinks}
      initialLoyaltyShares={loyaltyShares}
    />
  );
}
