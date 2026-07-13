import { createClient } from "@/lib/supabase/server";
import type { ArtifactType, ChatArtifact, ChatAttachment, ChatConversation, ChatMessage } from "@/lib/types";

type ChatConversationRow = {
  id: string;
  restaurant_id: string;
  created_by: string;
  title: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  conversation_id: string;
  restaurant_id: string;
  author_id: string | null;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type ChatAttachmentRow = {
  id: string;
  message_id: string;
  restaurant_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type ChatArtifactRow = {
  id: string;
  conversation_id: string;
  restaurant_id: string;
  message_id: string | null;
  type: ArtifactType;
  title: string;
  data: unknown;
  created_at: string;
};

function mapConversation(row: ChatConversationRow): ChatConversation {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    createdBy: row.created_by,
    title: row.title,
    archived: row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    restaurantId: row.restaurant_id,
    authorId: row.author_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapAttachment(row: ChatAttachmentRow): ChatAttachment {
  return {
    id: row.id,
    messageId: row.message_id,
    restaurantId: row.restaurant_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

function mapArtifact(row: ChatArtifactRow): ChatArtifact {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    restaurantId: row.restaurant_id,
    messageId: row.message_id,
    type: row.type,
    title: row.title,
    data: row.data,
    createdAt: row.created_at,
  };
}

export async function getConversations(restaurantId: string): Promise<ChatConversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("archived", false)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return (data as ChatConversationRow[]).map(mapConversation);
}

export async function getConversation(id: string): Promise<ChatConversation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapConversation(data as ChatConversationRow);
}

export async function createConversation(
  restaurantId: string,
  title?: string
): Promise<ChatConversation | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({ restaurant_id: restaurantId, created_by: user.id, title: title ?? null })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapConversation(data as ChatConversationRow);
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("chat_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*, chat_attachments(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (
    data as (ChatMessageRow & { chat_attachments: ChatAttachmentRow[] | null })[]
  ).map((row) => ({
    ...mapMessage(row),
    attachments: (row.chat_attachments ?? []).map(mapAttachment),
  }));
}

export type SaveMessageInput = {
  conversationId: string;
  restaurantId: string;
  role: "user" | "assistant";
  content: string;
  authorId?: string | null;
};

export async function saveMessage(input: SaveMessageInput): Promise<ChatMessage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: input.conversationId,
      restaurant_id: input.restaurantId,
      role: input.role,
      content: input.content,
      author_id: input.authorId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;

  await supabase
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.conversationId);

  return mapMessage(data as ChatMessageRow);
}

export type SaveAttachmentInput = {
  messageId: string;
  restaurantId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function saveAttachment(input: SaveAttachmentInput): Promise<void> {
  const supabase = await createClient();
  await supabase.from("chat_attachments").insert({
    message_id: input.messageId,
    restaurant_id: input.restaurantId,
    storage_path: input.storagePath,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
  });
}

export type SaveArtifactInput = {
  conversationId: string;
  restaurantId: string;
  messageId?: string | null;
  type: ArtifactType;
  title: string;
  data: unknown;
};

export async function saveArtifact(input: SaveArtifactInput): Promise<ChatArtifact | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_artifacts")
    .insert({
      conversation_id: input.conversationId,
      restaurant_id: input.restaurantId,
      message_id: input.messageId ?? null,
      type: input.type,
      title: input.title,
      data: input.data,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapArtifact(data as ChatArtifactRow);
}

export async function getLatestArtifact(conversationId: string): Promise<ChatArtifact | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_artifacts")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapArtifact(data as ChatArtifactRow);
}
