import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getOrCreateDefaultLoyaltyShare } from "@/lib/data/loyalty-shares";
import { StudioQrView } from "./StudioQrView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Studio QR & Affiches — Fidélisation" };
}

export default async function StudioQrPage() {
  const restaurantId = await getCurrentRestaurantId();
  const [restaurant, loyaltyShare] = restaurantId
    ? await Promise.all([getRestaurant(restaurantId), getOrCreateDefaultLoyaltyShare(restaurantId)])
    : [null, null];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";
  // /f/[token] (not /rejoindre/) — that's the real page (LoyaltyJoinFlow)
  // this token resolves to; falling back to the bare /portal when no share
  // exists yet would print a QR that doesn't actually join anyone to this
  // restaurant, so getOrCreateDefaultLoyaltyShare always returns a real one.
  const portalUrl = loyaltyShare ? `${appUrl}/f/${loyaltyShare.token}` : `${appUrl}/portal`;

  return <StudioQrView restaurantName={restaurant?.name ?? "Restaurant"} portalUrl={portalUrl} />;
}
