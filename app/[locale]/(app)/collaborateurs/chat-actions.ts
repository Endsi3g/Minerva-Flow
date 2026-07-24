"use server";

import {
  sendTeamMessage,
  deleteTeamMessage,
  pinTeamMessage,
  reactToTeamMessage,
  setChannelMembers,
  getChannelMembers,
} from "@/lib/data/team-chat";
import type { TeamChannel, TeamChatMessage } from "@/lib/types";

export async function sendTeamMessageAction(input: {
  restaurantId: string;
  channel: TeamChannel;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string | null;
  content: string;
  replyTo?: { id: string; authorName: string; content: string };
}): Promise<{ userMessage: TeamChatMessage; aiResponse?: TeamChatMessage }> {
  return await sendTeamMessage(input);
}

export async function deleteTeamMessageAction(
  messageId: string,
  requesterId: string,
  requesterRole: string
): Promise<void> {
  return await deleteTeamMessage(messageId, requesterId, requesterRole);
}

export async function pinTeamMessageAction(
  messageId: string,
  pinned: boolean
): Promise<void> {
  return await pinTeamMessage(messageId, pinned);
}

export async function reactToTeamMessageAction(
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  return await reactToTeamMessage(messageId, emoji, userId);
}

export async function getChannelMembersAction(
  restaurantId: string,
  channel: TeamChannel
): Promise<string[]> {
  return await getChannelMembers(restaurantId, channel);
}

export async function setChannelMembersAction(
  restaurantId: string,
  channel: TeamChannel,
  memberIds: string[],
  addedBy: string
): Promise<void> {
  return await setChannelMembers(restaurantId, channel, memberIds, addedBy);
}
