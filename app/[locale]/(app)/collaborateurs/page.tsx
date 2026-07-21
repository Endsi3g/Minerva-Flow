import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getCurrentWorkspaceMembership } from "@/lib/data/current-workspace";
import { getWorkspaceRestaurants } from "@/lib/data/workspaces";
import { getTeamMembers } from "@/lib/data/team";
import { CollaborateursView } from "./CollaborateursView";

export default async function CollaborateursPage() {
  const [restaurantId, workspaceMembership] = await Promise.all([
    getCurrentRestaurantId(),
    getCurrentWorkspaceMembership(),
  ]);

  const [members, restaurants] = await Promise.all([
    restaurantId ? getTeamMembers(restaurantId) : Promise.resolve([]),
    workspaceMembership ? getWorkspaceRestaurants(workspaceMembership.workspaceId) : Promise.resolve([]),
  ]);

  return (
    <CollaborateursView
      restaurantId={restaurantId}
      members={members}
      workspaceId={workspaceMembership?.workspaceId ?? null}
      restaurants={restaurants}
    />
  );
}
