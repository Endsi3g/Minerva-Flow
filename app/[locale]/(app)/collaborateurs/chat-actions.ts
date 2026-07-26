"use server";

import {
  sendTeamMessage,
  deleteTeamMessage,
  editTeamMessage,
  pinTeamMessage,
  reactToTeamMessage,
  setChannelMembers,
  getChannelMembers,
  listTeamChannelsForUser,
  createGroupChannel,
  getOrCreateDmChannel,
  getTeamMessages,
} from "@/lib/data/team-chat";
import type { TeamChannel, TeamChannelSummary, TeamChatMessage } from "@/lib/types";

export async function sendTeamMessageAction(input: {
  restaurantId: string;
  channel: TeamChannel;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string | null;
  content: string;
  audioPath?: string | null;
  replyTo?: { id: string; authorName: string; content: string };
}): Promise<{ userMessage: TeamChatMessage; aiResponse?: TeamChatMessage }> {
  return await sendTeamMessage(input);
}

export async function listTeamChannelsAction(
  restaurantId: string,
  userId: string
): Promise<TeamChannelSummary[]> {
  return await listTeamChannelsForUser(restaurantId, userId);
}

export async function createGroupChannelAction(
  restaurantId: string,
  name: string,
  memberIds: string[],
  createdBy: string
): Promise<TeamChannelSummary | null> {
  if (!name.trim() || memberIds.length === 0) return null;
  return await createGroupChannel(restaurantId, name, memberIds, createdBy);
}

export async function getOrCreateDmChannelAction(
  restaurantId: string,
  userId: string,
  otherUserId: string
): Promise<string | null> {
  if (userId === otherUserId) return null;
  return await getOrCreateDmChannel(restaurantId, userId, otherUserId);
}

export async function getTeamMessagesAction(
  restaurantId: string,
  channel: TeamChannel
): Promise<TeamChatMessage[]> {
  return await getTeamMessages(restaurantId, channel);
}

export async function deleteTeamMessageAction(
  messageId: string,
  requesterId: string,
  requesterRole: string
): Promise<void> {
  return await deleteTeamMessage(messageId, requesterId, requesterRole);
}

export async function editTeamMessageAction(
  messageId: string,
  requesterId: string,
  newContent: string
): Promise<void> {
  return await editTeamMessage(messageId, requesterId, newContent);
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
