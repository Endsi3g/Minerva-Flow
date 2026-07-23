"use server";

import { sendTeamMessage } from "@/lib/data/team-chat";
import type { TeamChannel, TeamChatMessage } from "@/lib/types";

export async function sendTeamMessageAction(input: {
  restaurantId: string;
  channel: TeamChannel;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
}): Promise<{ userMessage: TeamChatMessage; aiResponse?: TeamChatMessage }> {
  return await sendTeamMessage(input);
}
