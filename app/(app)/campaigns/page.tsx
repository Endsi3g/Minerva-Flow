import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCampaigns } from "@/lib/data/campaigns";
import { CampaignsView } from "./CampaignsView";

export default async function CampaignsPage() {
  const restaurantId = await getCurrentRestaurantId();
  const campaigns = restaurantId ? await getCampaigns(restaurantId) : [];

  return <CampaignsView restaurantId={restaurantId} campaigns={campaigns} />;
}
