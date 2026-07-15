import { redirect } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { NewCampaignView } from "./NewCampaignView";

export default async function NewCampaignPage() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) redirect("/campaigns");

  return <NewCampaignView restaurantId={restaurantId} />;
}
