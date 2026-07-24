"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runNvidiaAiModel } from "@/lib/ai/nvidia";
import { runCloudflareAiModel } from "@/lib/ai/cloudflare";
import type { TeamChannel, TeamChatMessage } from "@/lib/types";

/* ── helpers ── */
function dbRowToMessage(row: any): TeamChatMessage {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    channel: row.channel as TeamChannel,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role ?? "",
    authorAvatarUrl: row.author_avatar_url ?? undefined,
    content: row.deleted ? "" : row.content,
    isAiResponse: row.is_ai_response ?? false,
    isPinned: row.is_pinned ?? false,
    deleted: row.deleted ?? false,
    replyTo: row.reply_to ?? undefined,
    reactions: row.reactions ?? undefined,
    attachments: row.attachments ?? undefined,
    createdAt: row.created_at,
  };
}

/* ── fetch initial messages (server-side) ── */
export async function getTeamMessages(
  restaurantId: string,
  channel: TeamChannel,
  limit = 80
): Promise<TeamChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_chat_messages")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("channel", channel)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data.map(dbRowToMessage);
}

/* ── send a message ── */
export async function sendTeamMessage(input: {
  restaurantId: string;
  channel: TeamChannel;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatarUrl?: string | null;
  content: string;
  replyTo?: { id: string; authorName: string; content: string };
}): Promise<{ userMessage: TeamChatMessage; aiResponse?: TeamChatMessage }> {
  const admin = createAdminClient();

  const { data: userRow, error: insertError } = await admin
    .from("team_chat_messages")
    .insert({
      restaurant_id: input.restaurantId,
      channel: input.channel,
      author_id: input.authorId,
      author_name: input.authorName,
      author_role: input.authorRole,
      author_avatar_url: input.authorAvatarUrl ?? null,
      content: input.content,
      reply_to: input.replyTo ?? null,
      is_ai_response: false,
    })
    .select()
    .single();

  if (insertError || !userRow) {
    throw new Error(`Failed to insert message: ${insertError?.message}`);
  }

  const userMessage = dbRowToMessage(userRow);

  // Check for @FlowAI mention
  const isTagged = /@(FlowAI|Flow|flow|minerva)/i.test(input.content);
  let aiResponse: TeamChatMessage | undefined;

  if (isTagged) {
    const systemPrompt = `Tu es Flow AI, l'assistant d'exploitation du restaurant Minerva. Tu interviens directement dans le chat d'équipe du canal #${input.channel}. Réponds de façon concise, professionnelle et chaleureuse en français à l'équipe.`;
    const cleanPrompt = input.content.replace(/@(FlowAI|Flow|flow|minerva)/gi, "").trim();

    let responseText = await runNvidiaAiModel(cleanPrompt, systemPrompt);
    if (!responseText) responseText = await runCloudflareAiModel(cleanPrompt, systemPrompt);
    if (!responseText) {
      responseText = `Bonjour ${input.authorName} ! J'ai bien reçu votre message pour le canal #${input.channel}. Comment puis-je vous assister ?`;
    }

    const { data: aiRow } = await admin
      .from("team_chat_messages")
      .insert({
        restaurant_id: input.restaurantId,
        channel: input.channel,
        author_id: "ai-flow",
        author_name: "Flow AI",
        author_role: "Assistant IA Minerva",
        author_avatar_url: null,
        content: responseText,
        is_ai_response: true,
        reply_to: { id: userRow.id, authorName: input.authorName, content: input.content.slice(0, 80) },
      })
      .select()
      .single();

    if (aiRow) aiResponse = dbRowToMessage(aiRow);
  }

  return { userMessage, aiResponse };
}

/* ── soft delete a message ── */
export async function deleteTeamMessage(
  messageId: string,
  requesterId: string,
  requesterRole: string
): Promise<void> {
  const admin = createAdminClient();

  // fetch the message to verify ownership
  const { data: msg } = await admin
    .from("team_chat_messages")
    .select("author_id, is_ai_response")
    .eq("id", messageId)
    .single();

  // AI messages cannot be deleted
  if (msg?.is_ai_response) throw new Error("Cannot delete AI messages");

  const canDelete =
    msg?.author_id === requesterId ||
    requesterRole === "owner" ||
    requesterRole === "manager";

  if (!canDelete) throw new Error("Unauthorized");

  await admin
    .from("team_chat_messages")
    .update({ deleted: true })
    .eq("id", messageId);
}

/* ── edit a user message ── */
export async function editTeamMessage(
  messageId: string,
  requesterId: string,
  newContent: string
): Promise<void> {
  const admin = createAdminClient();

  const { data: msg } = await admin
    .from("team_chat_messages")
    .select("author_id, is_ai_response")
    .eq("id", messageId)
    .single();

  if (msg?.is_ai_response) throw new Error("Cannot edit AI messages");
  if (msg?.author_id !== requesterId) throw new Error("Unauthorized");

  const trimmed = newContent.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  await admin
    .from("team_chat_messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId);
}

/* ── pin / unpin a message ── */
export async function pinTeamMessage(
  messageId: string,
  pinned: boolean
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("team_chat_messages")
    .update({ is_pinned: pinned })
    .eq("id", messageId);
}

/* ── update reactions ── */
export async function reactToTeamMessage(
  messageId: string,
  emoji: string,
  userId: string
): Promise<void> {
  const admin = createAdminClient();

  // Fetch current reactions
  const { data: msg } = await admin
    .from("team_chat_messages")
    .select("reactions")
    .eq("id", messageId)
    .single();

  const reactions: Record<string, string[]> = msg?.reactions ?? {};
  const uids = reactions[emoji] ?? [];

  if (uids.includes(userId)) {
    reactions[emoji] = uids.filter((u) => u !== userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji] = [...uids, userId];
  }

  await admin
    .from("team_chat_messages")
    .update({ reactions })
    .eq("id", messageId);
}

/* ── channel member management ── */
export async function getChannelMembers(
  restaurantId: string,
  channel: TeamChannel
): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("team_channel_members")
    .select("member_id")
    .eq("restaurant_id", restaurantId)
    .eq("channel", channel);
  return (data ?? []).map((r: any) => r.member_id);
}

export async function setChannelMembers(
  restaurantId: string,
  channel: TeamChannel,
  memberIds: string[],
  addedBy: string
): Promise<void> {
  const admin = createAdminClient();

  // Delete all existing assignments for this channel
  await admin
    .from("team_channel_members")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("channel", channel);

  if (memberIds.length === 0) return;

  // Re-insert selected members
  await admin.from("team_channel_members").insert(
    memberIds.map((memberId) => ({
      restaurant_id: restaurantId,
      channel,
      member_id: memberId,
      added_by: addedBy,
    }))
  );
}
