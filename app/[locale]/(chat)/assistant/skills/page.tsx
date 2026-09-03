import { redirect } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { SkillsRegistryView } from "@/components/chat/SkillsRegistryView";

export default async function SkillsRegistryPage() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) redirect("/overview");

  const restaurant = await getRestaurant(restaurantId);

  return <SkillsRegistryView restaurantName={restaurant?.name} />;
}
