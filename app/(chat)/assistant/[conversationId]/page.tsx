import { redirect } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getConversations, getConversation, getMessages, getLatestArtifact } from "@/lib/data/chat";
import { AssistantChatView } from "@/components/chat/AssistantChatView";

export default async function AssistantConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) redirect("/overview");

  const conversation = await getConversation(conversationId);
  if (!conversation || conversation.restaurantId !== restaurantId) {
    redirect("/assistant");
  }

  const [conversations, messages, artifact] = await Promise.all([
    getConversations(restaurantId),
    getMessages(conversationId),
    getLatestArtifact(conversationId),
  ]);

  return (
    <AssistantChatView
      restaurantId={restaurantId}
      conversationId={conversationId}
      conversations={conversations}
      initialMessages={messages}
      initialArtifact={artifact}
    />
  );
}
