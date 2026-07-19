import { Suspense } from "react";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { ProgramsView } from "./ProgramsView";

export default async function ProgramsPage() {
  const restaurantId = await getCurrentRestaurantId();

  const [programs, campaigns] = restaurantId
    ? await Promise.all([getPrograms(restaurantId), getCampaigns(restaurantId)])
    : [[], []];

  return (
    <Suspense>
      <ProgramsView restaurantId={restaurantId} programs={programs} campaigns={campaigns} />
    </Suspense>
  );
}
