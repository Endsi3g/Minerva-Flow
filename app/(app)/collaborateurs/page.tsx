import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getTeamMembers } from "@/lib/data/team";
import { CollaborateursView } from "./CollaborateursView";

export default async function CollaborateursPage() {
  const restaurantId = await getCurrentRestaurantId();
  const members = restaurantId ? await getTeamMembers(restaurantId) : [];

  return <CollaborateursView restaurantId={restaurantId} members={members} />;
}
