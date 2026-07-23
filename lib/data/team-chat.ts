import { runNvidiaAiModel } from "@/lib/ai/nvidia";
import { runCloudflareAiModel } from "@/lib/ai/cloudflare";
import type { TeamChannel, TeamChatMessage } from "@/lib/types";

// Stockage des messages de chat d'équipe par restaurant et canal
const teamChatStore = new Map<string, TeamChatMessage[]>();

export function getInitialTeamMessages(restaurantId: string, channel: TeamChannel): TeamChatMessage[] {
  const key = `${restaurantId}:${channel}`;
  if (!teamChatStore.has(key)) {
    const defaultMessages: TeamChatMessage[] = [
      {
        id: `init-1-${channel}`,
        restaurantId,
        channel,
        authorId: "user-alexandre",
        authorName: "Alexandre Tremblay",
        authorRole: "Manager",
        content: `Bienvenue dans le canal #${channel} ! Pensez à mentionner @FlowAI pour obtenir une aide en direct.`,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: `init-2-${channel}`,
        restaurantId,
        channel,
        authorId: "ai-flow",
        authorName: "Flow AI",
        authorRole: "Assistant IA Minerva",
        content: "Bonjour l'équipe ! 🤖 Je suis à votre service dans ce canal. Mentionnez-moi avec @FlowAI ou @Flow pour que je vous aide !",
        isAiResponse: true,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
    teamChatStore.set(key, defaultMessages);
  }
  return teamChatStore.get(key) || [];
}

export async function sendTeamMessage(input: {
  restaurantId: string;
  channel: TeamChannel;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
}): Promise<{ userMessage: TeamChatMessage; aiResponse?: TeamChatMessage }> {
  const key = `${input.restaurantId}:${input.channel}`;
  const currentMessages = teamChatStore.get(key) || getInitialTeamMessages(input.restaurantId, input.channel);

  const userMessage: TeamChatMessage = {
    id: `msg-${Date.now()}`,
    restaurantId: input.restaurantId,
    channel: input.channel,
    authorId: input.authorId,
    authorName: input.authorName,
    authorRole: input.authorRole,
    content: input.content,
    createdAt: new Date().toISOString(),
  };

  currentMessages.push(userMessage);

  // Vérifier si l'IA est tagguée (@FlowAI ou @Flow)
  const isTagged = /@(FlowAI|Flow|flow|minerva)/i.test(input.content);
  let aiResponse: TeamChatMessage | undefined;

  if (isTagged) {
    const systemPrompt = `Tu es Flow AI, l'assistant d'exploitation du restaurant Minerva. Tu interviens directement dans le chat d'équipe du canal #${input.channel}. Réponds de façon concise, professionnelle et chaleureuse en français à l'équipe.`;
    const cleanPrompt = input.content.replace(/@(FlowAI|Flow|flow|minerva)/gi, "").trim();

    let responseText = await runNvidiaAiModel(cleanPrompt, systemPrompt);
    if (!responseText) {
      responseText = await runCloudflareAiModel(cleanPrompt, systemPrompt);
    }
    if (!responseText) {
      responseText = `Bonjour ${input.authorName} ! J'ai bien reçu votre message pour le canal #${input.channel}. Comment puis-je vous assister sur le service ou l'inventaire aujourd'hui ?`;
    }

    aiResponse = {
      id: `ai-${Date.now()}`,
      restaurantId: input.restaurantId,
      channel: input.channel,
      authorId: "ai-flow",
      authorName: "Flow AI",
      authorRole: "Assistant IA Minerva",
      content: responseText,
      isAiResponse: true,
      createdAt: new Date().toISOString(),
    };

    currentMessages.push(aiResponse);
  }

  teamChatStore.set(key, currentMessages);
  return { userMessage, aiResponse };
}
