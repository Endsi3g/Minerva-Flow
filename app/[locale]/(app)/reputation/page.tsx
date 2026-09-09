import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getPrivateReviews, getMenuAndOfferReviews, getGoogleReviews } from "@/lib/data/reputation";
import { ReputationView } from "./ReputationView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("breadcrumb");
  return { title: t("reputation") };
}

export default async function ReputationPage() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return <ReputationView restaurantId={null} restaurant={null} privateReviews={[]} itemReviews={[]} googleReviews={[]} />;
  }

  const [restaurant, privateReviews, itemReviews, googleReviews] = await Promise.all([
    getRestaurant(restaurantId),
    getPrivateReviews(restaurantId),
    getMenuAndOfferReviews(restaurantId),
    getGoogleReviews(restaurantId),
  ]);

  return (
    <ReputationView
      restaurantId={restaurantId}
      restaurant={restaurant}
      privateReviews={privateReviews}
      itemReviews={itemReviews}
      googleReviews={googleReviews}
    />
  );
}
