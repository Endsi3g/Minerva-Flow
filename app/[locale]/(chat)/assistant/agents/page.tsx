import { redirect } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getCustomAgents } from "@/lib/data/chat";
import { AgentsStoreView } from "@/components/chat/AgentsStoreView";

export default async function AgentsStorePage() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) redirect("/overview");

  const [restaurant, customAgents] = await Promise.all([
    getRestaurant(restaurantId),
    getCustomAgents(restaurantId),
  ]);

  return (
    <AgentsStoreView
      restaurantId={restaurantId}
      restaurantName={restaurant?.name}
      customAgents={customAgents}
    />
  );
}
