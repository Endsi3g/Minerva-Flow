import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getLoyaltySharesForRestaurant } from "@/lib/data/loyalty-shares";
import { StudioQrView } from "./StudioQrView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Studio QR & Affiches — Fidélisation" };
}

export default async function StudioQrPage() {
  const restaurantId = await getCurrentRestaurantId();
  const [restaurant, loyaltyShares] = restaurantId
    ? await Promise.all([getRestaurant(restaurantId), getLoyaltySharesForRestaurant(restaurantId)])
    : [null, []];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minerva-flow.vercel.app";
  const firstShareToken = loyaltyShares[0]?.token;
  const portalUrl = firstShareToken ? `${appUrl}/rejoindre/${firstShareToken}` : `${appUrl}/portal`;

  return <StudioQrView restaurantName={restaurant?.name ?? "Restaurant"} portalUrl={portalUrl} />;
}
