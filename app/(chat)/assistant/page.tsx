import { redirect } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getConversations, createConversation } from "@/lib/data/chat";

export default async function AssistantIndexPage() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) redirect("/overview");

  const conversations = await getConversations(restaurantId);
  const target = conversations[0] ?? (await createConversation(restaurantId));

  if (!target) redirect("/overview");
  redirect(`/assistant/${target.id}`);
}
