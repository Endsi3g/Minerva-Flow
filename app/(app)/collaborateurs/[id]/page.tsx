import { notFound } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getTeamMembers } from "@/lib/data/team";
import { MemberDetailPage } from "./MemberDetailPage";

export default async function CollaborateurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurantId = await getCurrentRestaurantId();
  const members = restaurantId ? await getTeamMembers(restaurantId) : [];
  const member = members.find((m) => m.id === id);

  if (!member || !restaurantId) notFound();

  return <MemberDetailPage restaurantId={restaurantId} member={member} />;
}
