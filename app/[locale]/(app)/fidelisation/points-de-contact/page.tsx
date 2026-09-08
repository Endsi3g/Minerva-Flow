import type { Metadata } from "next";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getTouchpointFunnels } from "@/lib/data/physical-touchpoints";
import { getNfcCardOrdersForRestaurant } from "@/lib/data/nfc-card-orders";
import { isNfcCardPurchaseConfigured } from "@/lib/stripe/config";
import { PointsDeContactView } from "./PointsDeContactView";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Points de contact — Fidélisation" };
}

export default async function PointsDeContactPage() {
  const restaurantId = await getCurrentRestaurantId();
  const [funnels, nfcCardOrders] = restaurantId
    ? await Promise.all([getTouchpointFunnels(restaurantId), getNfcCardOrdersForRestaurant(restaurantId)])
    : [[], []];

  return (
    <PointsDeContactView
      restaurantId={restaurantId}
      initialFunnels={funnels}
      nfcCardOrders={nfcCardOrders}
      nfcCardPurchaseEnabled={isNfcCardPurchaseConfigured()}
    />
  );
}
