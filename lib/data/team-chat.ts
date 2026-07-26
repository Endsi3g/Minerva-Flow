"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runNvidiaAiModel } from "@/lib/ai/nvidia";
import { runCloudflareAiModel } from "@/lib/ai/cloudflare";
import { generateToken } from "@/lib/tokens";
import { notifyUser } from "@/lib/data/notifications";
import type { TeamChannel, TeamChannelSummary, TeamChatMessage } from "@/lib/types";

const LEGACY_CHANNELS: { id: TeamChannel; name: string }[] = [
  { id: "general", name: "général" },
  { id: "cuisine", name: "cuisine" },
  { id: "service", name: "service" },
  { id: "urgences", name: "urgences" },
];

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
    audioPath: row.audio_url ?? undefined,
    createdAt: row.created_at,
  };
}

/** Deterministic id for a 1-to-1 DM — same value regardless of who starts it.
 * Uses a separator ("__") that never appears in a UUID, unlike "-". */
function dmChannelId(userIdA: string, userIdB: string): string {
  return `dm-${[userIdA, userIdB].sort().join("__")}`;
}

/**
 * Channels visible to this user: the 4 legacy ones (always open) plus any
 * dynamic group/DM the RLS policy (can_access_team_channel) actually lets
 * them see — this query runs on the session-scoped client on purpose so
 * privacy is enforced by the database, not by this function's logic.
 */
export async function listTeamChannelsForUser(
  restaurantId: string,
  userId: string
): Promise<TeamChannelSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_channels")
    .select("id, name, type")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  const dynamicRows = (data as { id: string; name: string; type: string }[] | null) ?? [];
  const dmRows = dynamicRows.filter((r) => r.type === "dm");

  // Resolve "the other participant" per DM via team_channel_members rather
  // than parsing the id — robust regardless of id format.
  const admin = createAdminClient();
  const otherMemberByChannel = new Map<string, string>();
  if (dmRows.length > 0) {
    const { data: memberRows } = await admin
      .from("team_channel_members")
      .select("channel, member_id")
      .eq("restaurant_id", restaurantId)
      .in("channel", dmRows.map((r) => r.id))
      .neq("member_id", userId);
    for (const row of (memberRows as { channel: string; member_id: string }[] | null) ?? []) {
      otherMemberByChannel.set(row.channel, row.member_id);
    }
  }

  const dynamic = dynamicRows.map((row): TeamChannelSummary => {
    if (row.type === "dm") {
      return { id: row.id, name: row.name, kind: "dm", otherMemberId: otherMemberByChannel.get(row.id) };
    }
    return { id: row.id, name: row.name, kind: "group" };
  });

  return [
    ...LEGACY_CHANNELS.map((c): TeamChannelSummary => ({ ...c, kind: "legacy" })),
    ...dynamic,
  ];
}

/**
 * Both channel creators below call one atomic RPC (create_team_channel_atomic)
 * instead of two separate inserts — a channel row followed by its membership
 * rows. Two separate inserts left a window where a failure between them
 * created a channel with zero membership rows, which the RLS function used to
 * treat as "unrestricted" (open to the whole restaurant). The RPC creates
 * both in one function call, so a failure rolls back the channel too instead
 * of leaving an orphaned, briefly-public one.
 */
export async function createGroupChannel(
  restaurantId: string,
  name: string,
  memberIds: string[],
  createdBy: string
): Promise<TeamChannelSummary | null> {
  const admin = createAdminClient();
  const id = `grp-${generateToken(12)}`;
  const allMemberIds = Array.from(new Set([createdBy, ...memberIds]));
  const trimmedName = name.trim();

  const { error } = await admin.rpc("create_team_channel_atomic", {
    p_restaurant_id: restaurantId,
    p_id: id,
    p_name: trimmedName,
    p_type: "group",
    p_member_ids: allMemberIds,
    p_created_by: createdBy,
  });
  if (error) return null;

  return { id, name: trimmedName, kind: "group" };
}

export async function getOrCreateDmChannel(
  restaurantId: string,
  userId: string,
  otherUserId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const id = dmChannelId(userId, otherUserId);

  const { data: existing } = await admin.from("team_channels").select("id").eq("id", id).maybeSingle();
  if (existing) return id;

  const { error } = await admin.rpc("create_team_channel_atomic", {
    p_restaurant_id: restaurantId,
    p_id: id,
    p_name: "Message privé",
    p_type: "dm",
    p_member_ids: [userId, otherUserId],
    p_created_by: userId,
  });
  if (error) return null;

  return id;
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
  audioPath?: string | null;
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
      audio_url: input.audioPath ?? null,
      reply_to: input.replyTo ?? null,
      is_ai_response: false,
    })
    .select()
    .single();

  if (insertError || !userRow) {
    throw new Error(`Failed to insert message: ${insertError?.message}`);
  }

  const userMessage = dbRowToMessage(userRow);

  // DM: notify the other participant — the whole point of a private message
  // is that it doesn't get missed the way a channel post might.
  if (input.channel.startsWith("dm-")) {
    const { data: memberRows } = await admin
      .from("team_channel_members")
      .select("member_id")
      .eq("restaurant_id", input.restaurantId)
      .eq("channel", input.channel)
      .neq("member_id", input.authorId);
    const recipientId = (memberRows as { member_id: string }[] | null)?.[0]?.member_id;
    if (recipientId) {
      await notifyUser({
        restaurantId: input.restaurantId,
        userId: recipientId,
        type: "team_chat.dm_received",
        title: `Message de ${input.authorName}`,
        body: input.audioPath ? "🎤 Message vocal" : input.content.slice(0, 100),
        link: "/collaborateurs",
      });
    }
  }

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
