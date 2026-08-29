import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getLoyaltyRewards } from "@/lib/data/customers";
import { getReferralPrograms } from "@/lib/data/referral-programs";
import { getReferralLinksForRestaurant } from "@/lib/data/customer-referrals";
import { computeReferralRoiMetrics, getTopAmbassadors } from "@/lib/data/referral-roi";
import { ParrainageView } from "./ParrainageView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Parrainage — Fidélisation" };
}

const EMPTY_ROI = {
  totalClicks: 0,
  totalConversions: 0,
  conversionRatePct: 0,
  totalRevenueGenerated: 0,
  estimatedRewardsCost: 0,
  netProfitGenerated: 0,
  roiMultiplier: 0,
  activeProgramsCount: 0,
  activeAmbassadorsCount: 0,
};

export default async function ParrainagePage() {
  const restaurantId = await getCurrentRestaurantId();

  const [rewards, referralPrograms, referralLinks, referralRoi, topAmbassadors] = restaurantId
    ? await Promise.all([
        getLoyaltyRewards(restaurantId),
        getReferralPrograms(restaurantId),
        getReferralLinksForRestaurant(restaurantId),
        computeReferralRoiMetrics(restaurantId),
        getTopAmbassadors(restaurantId),
      ])
    : [[], [], [], EMPTY_ROI, []];

  return (
    <ParrainageView
      restaurantId={restaurantId}
      initialReferralPrograms={referralPrograms}
      referralLinks={referralLinks}
      rewards={rewards}
      referralRoi={referralRoi}
      topAmbassadors={topAmbassadors}
    />
  );
}
