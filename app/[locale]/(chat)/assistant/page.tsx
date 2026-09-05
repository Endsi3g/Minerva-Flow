import { redirect } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getConversations, createConversation } from "@/lib/data/chat";
import { isPlatformAdmin } from "@/lib/data/admin";
import { AssistantUnavailable } from "@/components/chat/AssistantUnavailable";

export default async function AssistantIndexPage() {
  if (!(await isPlatformAdmin())) return <AssistantUnavailable />;

  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) redirect("/overview");

  const conversations = await getConversations(restaurantId);
  const target = conversations[0] ?? (await createConversation(restaurantId));

  if (!target) redirect("/overview");
  redirect(`/assistant/${target.id}`);
}
