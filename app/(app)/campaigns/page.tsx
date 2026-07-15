import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCampaigns } from "@/lib/data/campaigns";
import { CampaignsView } from "./CampaignsView";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const restaurantId = await getCurrentRestaurantId();
  const campaigns = restaurantId ? await getCampaigns(restaurantId) : [];
  const { id } = await searchParams;

  return (
    <CampaignsView
      restaurantId={restaurantId}
      campaigns={campaigns}
      initialSelectedId={id}
    />
  );
}
