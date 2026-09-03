import { createClient } from "@/lib/supabase/server";
import type {
  ArtifactType,
  ChatArtifact,
  ChatAttachment,
  ChatConversation,
  ChatMessage,
  ChatCanvasDoc,
  ChatProjectFolder,
  ChatProjectDoc,
  RestaurantCustomAgent,
} from "@/lib/types";

type ChatConversationRow = {
  id: string;
  restaurant_id: string;
  created_by: string;
  title: string | null;
  archived: boolean;
  is_pinned?: boolean;
  agent_id?: string;
  active_dossiers?: string[];
  created_at: string;
  updated_at: string;
};

type ChatCanvasDocRow = {
  id: string;
  restaurant_id: string;
  conversation_id: string | null;
  title: string;
  content: string;
  content_json: Record<string, unknown>;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ChatProjectFolderRow = {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ChatProjectDocRow = {
  id: string;
  folder_id: string;
  restaurant_id: string;
  title: string;
  content: string;
  category: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type RestaurantCustomAgentRow = {
  id: string;
  restaurant_id: string;
  name: string;
  role: string;
  avatar: string;
  description: string | null;
  system_prompt: string;
  tone: string;
  skills: string[];
  is_active: boolean;
  created_by: string | null;
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
    isPinned: row.is_pinned ?? false,
    agentId: row.agent_id ?? "general",
    activeDossiers: row.active_dossiers ?? ["menu", "finance", "loyalty", "operations"],
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

export async function deleteConversation(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_conversations")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
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

  if (error || !data) {
    console.error("saveMessage failed:", error?.message);
    return null;
  }

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

// ── Gestion Avancée des Conversations ──────────────────────────────────────
export async function togglePinConversation(conversationId: string, isPinned: boolean): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_conversations")
    .update({ is_pinned: isPinned })
    .eq("id", conversationId);
  return !error;
}

export async function updateConversationAgent(conversationId: string, agentId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_conversations")
    .update({ agent_id: agentId })
    .eq("id", conversationId);
  return !error;
}

export async function updateConversationDossiers(conversationId: string, activeDossiers: string[]): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_conversations")
    .update({ active_dossiers: activeDossiers })
    .eq("id", conversationId);
  return !error;
}

// ── Documents Canvas WYSIWYG ───────────────────────────────────────────────
function mapCanvasDoc(row: ChatCanvasDocRow): ChatCanvasDoc {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    conversationId: row.conversation_id,
    title: row.title,
    content: row.content,
    contentJson: row.content_json,
    version: row.version,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCanvasDocs(restaurantId: string, conversationId?: string): Promise<ChatCanvasDoc[]> {
  const supabase = await createClient();
  let query = supabase
    .from("chat_canvas_docs")
    .select("*")
    .eq("restaurant_id", restaurantId);

  if (conversationId) {
    query = query.eq("conversation_id", conversationId);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error || !data) return [];
  return (data as ChatCanvasDocRow[]).map(mapCanvasDoc);
}

export async function getCanvasDoc(id: string): Promise<ChatCanvasDoc | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_canvas_docs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapCanvasDoc(data as ChatCanvasDocRow);
}

export type SaveCanvasDocInput = {
  id?: string;
  restaurantId: string;
  conversationId?: string | null;
  title: string;
  content: string;
  contentJson?: Record<string, unknown>;
};

export async function saveCanvasDoc(input: SaveCanvasDocInput): Promise<ChatCanvasDoc | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (input.id) {
    const { data: current } = await supabase
      .from("chat_canvas_docs")
      .select("version")
      .eq("id", input.id)
      .maybeSingle();

    const nextVersion = (current?.version ?? 1) + 1;
    const { data, error } = await supabase
      .from("chat_canvas_docs")
      .update({
        title: input.title,
        content: input.content,
        content_json: input.contentJson ?? {},
        version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .select("*")
      .single();

    if (error || !data) return null;
    return mapCanvasDoc(data as ChatCanvasDocRow);
  }

  const { data, error } = await supabase
    .from("chat_canvas_docs")
    .insert({
      restaurant_id: input.restaurantId,
      conversation_id: input.conversationId ?? null,
      title: input.title,
      content: input.content,
      content_json: input.contentJson ?? {},
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapCanvasDoc(data as ChatCanvasDocRow);
}

export async function deleteCanvasDoc(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("chat_canvas_docs").delete().eq("id", id);
  return !error;
}

// ── Dossiers Contextuels RAG & Documents ───────────────────────────────────
function mapProjectFolder(row: ChatProjectFolderRow): ChatProjectFolder {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    color: row.color,
    isSystem: row.is_system,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProjectFolders(restaurantId: string): Promise<ChatProjectFolder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_project_folders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error || !data) return [];
  return (data as ChatProjectFolderRow[]).map(mapProjectFolder);
}

export async function createProjectFolder(
  restaurantId: string,
  name: string,
  slug?: string,
  description?: string
): Promise<ChatProjectFolder | null> {
  const supabase = await createClient();
  const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const { data, error } = await supabase
    .from("chat_project_folders")
    .insert({
      restaurant_id: restaurantId,
      name,
      slug: finalSlug,
      description: description ?? null,
      is_system: false,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapProjectFolder(data as ChatProjectFolderRow);
}

export async function deleteProjectFolder(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("chat_project_folders").delete().eq("id", id);
  return !error;
}

function mapProjectDoc(row: ChatProjectDocRow): ChatProjectDoc {
  return {
    id: row.id,
    folderId: row.folder_id,
    restaurantId: row.restaurant_id,
    title: row.title,
    content: row.content,
    category: row.category,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProjectDocs(restaurantId: string, folderId?: string): Promise<ChatProjectDoc[]> {
  const supabase = await createClient();
  let query = supabase.from("chat_project_docs").select("*").eq("restaurant_id", restaurantId);
  if (folderId) query = query.eq("folder_id", folderId);

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error || !data) return [];
  return (data as ChatProjectDocRow[]).map(mapProjectDoc);
}

export async function saveProjectDoc(
  folderId: string,
  restaurantId: string,
  title: string,
  content: string,
  category = "sop"
): Promise<ChatProjectDoc | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("chat_project_docs")
    .insert({
      folder_id: folderId,
      restaurant_id: restaurantId,
      title,
      content,
      category,
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapProjectDoc(data as ChatProjectDocRow);
}

// ── Agents Personnalisés du Restaurant ─────────────────────────────────────
function mapCustomAgent(row: RestaurantCustomAgentRow): RestaurantCustomAgent {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    description: row.description,
    systemPrompt: row.system_prompt,
    tone: row.tone,
    skills: row.skills,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCustomAgents(restaurantId: string): Promise<RestaurantCustomAgent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_custom_agents")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as RestaurantCustomAgentRow[]).map(mapCustomAgent);
}

export type CreateCustomAgentInput = {
  restaurantId: string;
  name: string;
  role: string;
  avatar?: string;
  description?: string;
  systemPrompt: string;
  tone?: string;
  skills?: string[];
};

export async function createCustomAgent(input: CreateCustomAgentInput): Promise<RestaurantCustomAgent | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("restaurant_custom_agents")
    .insert({
      restaurant_id: input.restaurantId,
      name: input.name,
      role: input.role,
      avatar: input.avatar ?? "👨‍🍳",
      description: input.description ?? null,
      system_prompt: input.systemPrompt,
      tone: input.tone ?? "expert_chaleureux",
      skills: input.skills ?? [],
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapCustomAgent(data as RestaurantCustomAgentRow);
}

export async function deleteCustomAgent(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurant_custom_agents")
    .update({ is_active: false })
    .eq("id", id);
  return !error;
}
