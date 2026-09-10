import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getPrivateReviews, getMenuAndOfferReviews, getGoogleReviews } from "@/lib/data/reputation";
import { AllReviewsView } from "./AllReviewsView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Toutes les revues · Réputation" };
}

export default async function AllReviewsPage() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return <AllReviewsView restaurantId={null} restaurant={null} privateReviews={[]} itemReviews={[]} googleReviews={[]} />;
  }

  const [restaurant, privateReviews, itemReviews, googleReviews] = await Promise.all([
    getRestaurant(restaurantId),
    getPrivateReviews(restaurantId),
    getMenuAndOfferReviews(restaurantId),
    getGoogleReviews(restaurantId),
  ]);

  return (
    <AllReviewsView
      restaurantId={restaurantId}
      restaurant={restaurant}
      privateReviews={privateReviews}
      itemReviews={itemReviews}
      googleReviews={googleReviews}
    />
  );
}
