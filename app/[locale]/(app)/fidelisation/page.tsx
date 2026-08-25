import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCustomers, getLoyaltyRewards } from "@/lib/data/customers";
import { getRestaurant } from "@/lib/data/restaurants";
import { getReferralPrograms } from "@/lib/data/referral-programs";
import { getReferralLinksForRestaurant } from "@/lib/data/customer-referrals";
import { getLoyaltySharesForRestaurant } from "@/lib/data/loyalty-shares";
import { computeReferralRoiMetrics, getTopAmbassadors } from "@/lib/data/referral-roi";
import { FidelisationView } from "./FidelisationView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("fidelisation") };
}

export default async function FidelisationPage() {
  const restaurantId = await getCurrentRestaurantId();

  const [customers, rewards, restaurant, referralPrograms, referralLinks, loyaltyShares, referralRoi, topAmbassadors] = restaurantId
    ? await Promise.all([
        getCustomers(restaurantId),
        getLoyaltyRewards(restaurantId),
        getRestaurant(restaurantId),
        getReferralPrograms(restaurantId),
        getReferralLinksForRestaurant(restaurantId),
        getLoyaltySharesForRestaurant(restaurantId),
        computeReferralRoiMetrics(restaurantId),
        getTopAmbassadors(restaurantId),
      ])
    : [
        [],
        [],
        null,
        [],
        [],
        [],
        {
          totalClicks: 0,
          totalConversions: 0,
          conversionRatePct: 0,
          totalRevenueGenerated: 0,
          estimatedRewardsCost: 0,
          netProfitGenerated: 0,
          roiMultiplier: 0,
          activeProgramsCount: 0,
          activeAmbassadorsCount: 0,
        },
        [],
      ];

  return (
    <FidelisationView
      restaurantId={restaurantId}
      restaurantName={restaurant?.name ?? "Restaurant"}
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
      referralRoi={referralRoi}
      topAmbassadors={topAmbassadors}
    />
  );
}
