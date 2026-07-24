"use client";

import {
  useState,
  useOptimistic,
  useTransition,
  useRef,
  useEffect,
} from "react";
import Image from "next/image";
import {
  sendTeamMessageAction,
  deleteTeamMessageAction,
  pinTeamMessageAction,
  reactToTeamMessageAction,
  getChannelMembersAction,
  setChannelMembersAction,
} from "@/app/[locale]/(app)/collaborateurs/chat-actions";
import { useApp } from "@/lib/app-context";
import { useTeamPresence } from "@/hooks/use-team-presence";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { TeamChannel, TeamChatMessage, TeamMember } from "@/lib/types";
import {
  MessageSquare,
  Send,
  Bell,
  BellOff,
  Users,
  Utensils,
  AlertTriangle,
  AtSign,
  Pin,
  Reply,
  Mic,
  MicOff,
  Paperclip,
  Smile,
  Plus,
  X,
  Hash,
  Trash2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

/* ─────────────────────────── constants ──────────────────────────── */

const CHANNELS: { id: TeamChannel; label: string; icon: any; description: string }[] = [
  { id: "general",  label: "général",   icon: MessageSquare, description: "Échanges d'équipe & annonces" },
  { id: "cuisine",  label: "cuisine",   icon: Utensils,      description: "Coordination & recettes" },
  { id: "service",  label: "service",   icon: Users,         description: "Salle, réservations & VIP" },
  { id: "urgences", label: "urgences",  icon: AlertTriangle, description: "Absences & alertes immédiates" },
];

const EMOJI_QUICK = ["❤️", "👍", "😄", "🙌", "🔥", "👀"];

/* ──────────────────────── date separator ───────────────────────── */

function dateSeparatorLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isToday) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-CA", { weekday: "long", month: "long", day: "numeric" });
}

function groupMessagesByDate(msgs: TeamChatMessage[]) {
  const groups: { label: string; messages: TeamChatMessage[] }[] = [];
  let currentLabel = "";
  for (const msg of msgs) {
    const label = dateSeparatorLabel(msg.createdAt);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

/* ────────────────── Flow AI avatar ──────────────────────────────── */

function FlowAIAvatar({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-full border border-mv-green/30 bg-mv-green/10 overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src="/icon-512.png"
        alt="Flow AI"
        width={size}
        height={size}
        className="object-cover"
        priority
      />
    </div>
  );
}

/* ────────────────────────── single message ──────────────────────── */

function MessageRow({
  msg,
  isSelf,
  canDelete,
  onReact,
  onReply,
  onPin,
  onDelete,
  currentUserId,
}: {
  msg: TeamChatMessage;
  isSelf: boolean;
  canDelete: boolean;
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: TeamChatMessage) => void;
  onPin: (msgId: string, pinned: boolean) => void;
  onDelete: (msgId: string) => void;
  currentUserId: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const time = new Date(msg.createdAt).toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isAI = msg.isAiResponse;

  // Deleted message
  if (msg.deleted) {
    return (
      <div className={cn("flex gap-3 px-4 py-1", isSelf ? "flex-row-reverse" : "flex-row")}>
        <div className="shrink-0 mt-1">
          {isAI ? <FlowAIAvatar size={32} /> : (
            <Avatar name={msg.authorName} src={msg.authorAvatarUrl ?? undefined} size={32} />
          )}
        </div>
        <div className={cn("flex flex-col max-w-[72%]", isSelf ? "items-end" : "items-start")}>
          <div className={cn(
            "rounded-2xl px-4 py-2.5 text-[13px] italic text-mv-ink-faint border border-mv-border-soft",
            isSelf ? "rounded-tr-sm" : "rounded-tl-sm"
          )}>
            Message supprimé
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("group flex gap-3 px-4 py-1 relative", isSelf ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setEmojiOpen(false); }}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        {isAI ? (
          <FlowAIAvatar size={32} />
        ) : (
          <Avatar name={msg.authorName} src={msg.authorAvatarUrl ?? undefined} size={32} />
        )}
      </div>

      {/* Bubble + meta */}
      <div className={cn("flex flex-col max-w-[72%] min-w-0", isSelf ? "items-end" : "items-start")}>
        {/* Author + time */}
        <div className={cn("flex items-center gap-2 mb-1", isSelf ? "flex-row-reverse" : "flex-row")}>
          <span className="text-[12px] font-semibold text-mv-ink">
            {isAI ? "Flow AI" : isSelf ? "Vous" : msg.authorName}
          </span>
          <span className="text-[10.5px] text-mv-ink-faint">{time}</span>
          {msg.isPinned && <Pin size={11} className="text-mv-amber" />}
        </div>

        {/* Reply citation */}
        {msg.replyTo && (
          <div className={cn(
            "text-[11.5px] text-mv-ink-soft border-l-2 border-mv-green/50 pl-2 mb-1 line-clamp-1 italic opacity-75",
            isSelf ? "text-right border-l-0 border-r-2 pr-2 pl-0" : ""
          )}>
            <span className="font-semibold not-italic">{msg.replyTo.authorName}: </span>
            {msg.replyTo.content}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words",
            isSelf
              ? "bg-mv-green text-white rounded-tr-sm"
              : isAI
              ? "bg-mv-green/8 border border-mv-green/20 text-mv-ink rounded-tl-sm"
              : "bg-white border border-mv-border-soft text-mv-ink rounded-tl-sm shadow-sm"
          )}
        >
          <span dangerouslySetInnerHTML={{
            __html: msg.content
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/@(\w+)/g, '<span class="font-semibold text-mv-green-dark">@$1</span>')
          }} />
        </div>

        {/* Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isSelf ? "justify-end" : "justify-start")}>
            {Object.entries(msg.reactions).map(([emoji, uids]) =>
              uids.length === 0 ? null : (
                <button
                  key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-all",
                    uids.includes(currentUserId)
                      ? "bg-mv-green/10 border-mv-green/30 text-mv-green-dark"
                      : "bg-white border-mv-border-soft text-mv-ink hover:bg-mv-cream"
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{uids.length}</span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Action toolbar (hover) */}
      {hovered && (
        <div
          className={cn(
            "absolute top-0 flex items-center gap-0.5 bg-white border border-mv-border rounded-xl shadow-md px-1.5 py-1 z-20",
            isSelf ? "right-12" : "left-12"
          )}
        >
          {/* Emoji picker */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setEmojiOpen((p) => !p)}
                className="flex items-center justify-center h-6 w-6 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink transition-colors"
              >
                <Smile size={14} />
              </TooltipTrigger>
              <TooltipContent side="top">Réagir avec un emoji</TooltipContent>
            </Tooltip>
            {emojiOpen && (
              <div className={cn(
                "absolute top-8 flex gap-1 bg-white border border-mv-border rounded-xl shadow-lg p-1.5 z-30",
                isSelf ? "right-0" : "left-0"
              )}>
                {EMOJI_QUICK.map((e) => (
                  <button
                    key={e}
                    onClick={() => { onReact(msg.id, e); setEmojiOpen(false); }}
                    className="text-[16px] hover:scale-125 transition-transform p-0.5 rounded"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Tooltip>
            <TooltipTrigger
              onClick={() => onReply(msg)}
              className="flex items-center justify-center h-6 w-6 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink transition-colors"
            >
              <Reply size={13} />
            </TooltipTrigger>
            <TooltipContent side="top">Répondre à ce message</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              onClick={() => onPin(msg.id, !msg.isPinned)}
              className="flex items-center justify-center h-6 w-6 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink transition-colors"
            >
              <Pin size={13} className={msg.isPinned ? "text-mv-amber" : ""} />
            </TooltipTrigger>
            <TooltipContent side="top">{msg.isPinned ? "Désépingler" : "Épingler le message"}</TooltipContent>
          </Tooltip>

          {canDelete && (
            <Tooltip>
              <TooltipTrigger
                onClick={() => onDelete(msg.id)}
                className="flex items-center justify-center h-6 w-6 rounded-lg hover:bg-red-50 text-mv-ink-faint hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </TooltipTrigger>
              <TooltipContent side="top">Supprimer ce message</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Channel Access Drawer ── */

function ChannelAccessDrawer({
  restaurantId,
  channel,
  teamMembers,
  currentUserId,
  onClose,
}: {
  restaurantId: string;
  channel: TeamChannel;
  teamMembers: TeamMember[];
  currentUserId: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    getChannelMembersAction(restaurantId, channel).then((ids) => {
      if (ids.length > 0) {
        setRestricted(true);
        setSelected(new Set(ids));
      }
      setLoading(false);
    });
  }, [restaurantId, channel]);

  async function handleSave() {
    setSaving(true);
    try {
      const ids = restricted ? Array.from(selected) : [];
      await setChannelMembersAction(restaurantId, channel, ids, currentUserId);
      toast.success("Accès mis à jour !");
      onClose();
    } catch {
      toast.error("Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative h-full w-80 bg-white border-l border-mv-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-mv-border">
          <div>
            <p className="text-[14px] font-semibold text-mv-ink">Accès au canal</p>
            <p className="text-[12px] text-mv-ink-soft">#{channel}</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Restriction toggle */}
        <div className="px-5 py-4 border-b border-mv-border-soft">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-[13px] font-medium text-mv-ink">Canal restreint</p>
              <p className="text-[11.5px] text-mv-ink-soft mt-0.5">
                {restricted
                  ? "Seuls les membres sélectionnés y ont accès"
                  : "Tous les membres ont accès à ce canal"}
              </p>
            </div>
            <button
              onClick={() => setRestricted((p) => !p)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                restricted ? "bg-mv-green" : "bg-mv-border"
              )}
            >
              <span
                className={cn(
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                  restricted ? "translate-x-4.5" : "translate-x-0.5"
                )}
              />
            </button>
          </label>
        </div>

        {/* Members list */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-mv-green border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {restricted && (
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint px-2 mb-2">
                Membres ayant accès
              </p>
            )}
            {teamMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => restricted && toggle(m.id)}
                disabled={!restricted}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors text-left",
                  restricted
                    ? "hover:bg-mv-cream cursor-pointer"
                    : "cursor-default opacity-50"
                )}
              >
                <Avatar name={m.name} src={m.avatarUrl} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-mv-ink truncate">{m.name}</p>
                  <p className="text-[11px] text-mv-ink-faint capitalize">{m.role}</p>
                </div>
                {restricted && (
                  <div className={cn(
                    "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                    selected.has(m.id)
                      ? "bg-mv-green border-mv-green"
                      : "border-mv-border bg-white"
                  )}>
                    {selected.has(m.id) && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3 text-white fill-none stroke-white stroke-2">
                        <polyline points="2,6 5,9 10,3" />
                      </svg>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Save */}
        <div className="p-4 border-t border-mv-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-mv-green py-2.5 text-[13px] font-semibold text-white hover:bg-mv-green-dark disabled:opacity-50 transition-all"
          >
            {saving ? "Enregistrement…" : "Enregistrer les accès"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── main component ──────────────────────── */

export function TeamChatView({
  restaurantId,
  initialMessages,
  teamMembers,
  onInvite,
}: {
  restaurantId: string;
  initialMessages: TeamChatMessage[];
  teamMembers: TeamMember[];
  onInvite?: () => void;
}) {
  const { authUser, role } = useApp();
  const onlineIds = useTeamPresence(restaurantId, authUser);

  const [activeChannel, setActiveChannel] = useState<TeamChannel>("general");
  const [inputContent, setInputContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<TeamChatMessage | null>(null);
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showMembers, setShowMembers] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [managingChannel, setManagingChannel] = useState<TeamChannel | null>(null);
  const [, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserId = authUser?.id || "user-current";
  const canManageChannels = role === "owner" || role === "manager";

  // Local message state (seeded with server-fetched initialMessages)
  const [messages, setMessages] = useState<TeamChatMessage[]>(initialMessages);

  // Filter by active channel
  const channelMessages = messages.filter((m) => m.channel === activeChannel);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic<TeamChatMessage[], TeamChatMessage>(
    channelMessages,
    (state, msg) => [...state, msg]
  );

  // ── Supabase Realtime subscription ──
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`team-chat-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_chat_messages",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg: TeamChatMessage = {
              id: payload.new.id,
              restaurantId: payload.new.restaurant_id,
              channel: payload.new.channel,
              authorId: payload.new.author_id,
              authorName: payload.new.author_name,
              authorRole: payload.new.author_role ?? "",
              authorAvatarUrl: payload.new.author_avatar_url,
              content: payload.new.content,
              isAiResponse: payload.new.is_ai_response,
              isPinned: payload.new.is_pinned,
              deleted: payload.new.deleted,
              replyTo: payload.new.reply_to ?? undefined,
              reactions: payload.new.reactions ?? undefined,
              createdAt: payload.new.created_at,
            };
            // Only add if not already in list (avoid duplicate from optimistic)
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.new.id
                  ? {
                      ...m,
                      content: payload.new.content,
                      deleted: payload.new.deleted,
                      isPinned: payload.new.is_pinned,
                      reactions: payload.new.reactions ?? undefined,
                    }
                  : m
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [optimisticMessages, activeChannel]);

  const channelPinned = optimisticMessages.filter((m) => m.isPinned && !m.deleted);

  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Votre navigateur ne supporte pas les notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      toast.success("Notifications activées !");
    } else {
      toast.error("Permission refusée.");
    }
  }

  function handleInputChange(val: string) {
    setInputContent(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1 && lastAt === val.length - 1) {
      setShowMentionPopover(true);
      setMentionSearch("");
    } else if (lastAt !== -1 && lastAt < val.length - 1) {
      const after = val.slice(lastAt + 1);
      if (/^\w*$/.test(after)) {
        setShowMentionPopover(true);
        setMentionSearch(after.toLowerCase());
      } else {
        setShowMentionPopover(false);
      }
    } else {
      setShowMentionPopover(false);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setTypingUsers([]), 2000);
  }

  function insertMention(tag: string) {
    setInputContent((prev) => {
      const idx = prev.lastIndexOf("@");
      return idx !== -1 ? prev.slice(0, idx) + `@${tag} ` : prev + `@${tag} `;
    });
    setShowMentionPopover(false);
    inputRef.current?.focus();
  }

  async function handleReact(msgId: string, emoji: string) {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = { ...(m.reactions ?? {}) };
        const uids = reactions[emoji] ? [...reactions[emoji]] : [];
        if (uids.includes(currentUserId)) {
          reactions[emoji] = uids.filter((u) => u !== currentUserId);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...uids, currentUserId];
        }
        return { ...m, reactions };
      })
    );
    try {
      await reactToTeamMessageAction(msgId, emoji, currentUserId);
    } catch {
      toast.error("Erreur lors de la réaction.");
    }
  }

  async function handlePin(msgId: string, pinned: boolean) {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isPinned: pinned } : m));
    try {
      await pinTeamMessageAction(msgId, pinned);
    } catch {
      toast.error("Erreur lors de l'épinglage.");
    }
  }

  async function handleDelete(msgId: string) {
    if (!window.confirm("Supprimer ce message ?")) return;
    // Soft delete optimistic
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, deleted: true } : m));
    try {
      await deleteTeamMessageAction(msgId, currentUserId, role ?? "staff");
      toast.success("Message supprimé.");
    } catch {
      toast.error("Erreur lors de la suppression.");
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, deleted: false } : m));
    }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const content = inputContent.trim();
    if (!content) return;

    setInputContent("");
    setShowMentionPopover(false);

    const authorName = authUser?.fullName || "Collaborateur";
    const authorRole = role || "Membre";
    const authorAvatarUrl = authUser?.avatarUrl ?? null;

    const tempId = `temp-${Date.now()}`;
    const tempMsg: TeamChatMessage = {
      id: tempId,
      restaurantId,
      channel: activeChannel,
      authorId: currentUserId,
      authorName,
      authorRole,
      authorAvatarUrl,
      content,
      replyTo: replyingTo
        ? { id: replyingTo.id, authorName: replyingTo.authorName, content: replyingTo.content }
        : undefined,
      createdAt: new Date().toISOString(),
    };

    setReplyingTo(null);

    startTransition(() => {
      addOptimisticMessage(tempMsg);
    });

    try {
      const res = await sendTeamMessageAction({
        restaurantId,
        channel: activeChannel,
        authorId: currentUserId,
        authorName,
        authorRole,
        authorAvatarUrl,
        content,
        replyTo: tempMsg.replyTo,
      });

      // Replace temp message with real one
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        return [...without, res.userMessage, ...(res.aiResponse ? [res.aiResponse] : [])];
      });

      if (res.aiResponse && notificationsEnabled && typeof window !== "undefined" && "Notification" in window) {
        new Notification("Réponse de Flow AI 🤖", {
          body: res.aiResponse.content.slice(0, 100),
          icon: "/icon-512.png",
        });
      }
    } catch {
      toast.error("Erreur lors de l'envoi du message.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setReplyingTo(null);
      setShowMentionPopover(false);
    }
  }

  const mentionSuggestions = [
    { id: "ai-flow", name: "FlowAI", role: "Assistant IA", isAI: true },
    ...teamMembers.map((m) => ({ id: m.id, name: m.name.split(" ")[0], role: m.role, isAI: false })),
  ].filter((s) => s.name.toLowerCase().includes(mentionSearch));

  const groups = groupMessagesByDate(optimisticMessages);

  const isOnline = (id: string) =>
    Array.isArray(onlineIds) ? onlineIds.includes(id) : (onlineIds as any)?.has?.(id) ?? false;

  return (
    <>
      <div className="flex h-[calc(100vh-130px)] min-h-[600px] bg-[#fafaf9] rounded-2xl border border-mv-border overflow-hidden shadow-mv-md">

        {/* ── Main Chat Area ── */}
        <div className="flex flex-1 flex-col min-w-0">

          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-mv-border bg-white px-5 py-3 shrink-0">
            <div className="flex items-center gap-1">
              {CHANNELS.map((ch) => {
                const isActive = activeChannel === ch.id;
                return (
                  <div key={ch.id} className="flex items-center">
                    <Tooltip>
                      <TooltipTrigger
                        onClick={() => setActiveChannel(ch.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-all",
                          isActive
                            ? "bg-mv-green text-white shadow-sm"
                            : "text-mv-ink-soft hover:bg-mv-cream hover:text-mv-ink"
                        )}
                      >
                        <Hash size={12} />
                        {ch.label}
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{ch.description}</TooltipContent>
                    </Tooltip>
                    {/* Channel settings (owner/manager only) */}
                    {canManageChannels && isActive && (
                      <Tooltip>
                        <TooltipTrigger
                          onClick={() => setManagingChannel(ch.id)}
                          className="ml-0.5 flex items-center justify-center h-6 w-6 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink transition-colors"
                        >
                          <Settings2 size={12} />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Gérer les accès au canal #{ch.id}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  onClick={enableNotifications}
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-lg border transition-all",
                    notificationsEnabled
                      ? "border-mv-green/30 bg-mv-green/10 text-mv-green-dark"
                      : "border-mv-border bg-white text-mv-ink-faint hover:bg-mv-cream"
                  )}
                >
                  {notificationsEnabled ? <Bell size={15} /> : <BellOff size={15} />}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {notificationsEnabled ? "Notifications activées — cliquer pour désactiver" : "Activer les notifications Web Push"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  onClick={() => setShowMembers((p) => !p)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-all",
                    showMembers
                      ? "border-mv-green/30 bg-mv-green/10 text-mv-green-dark"
                      : "border-mv-border bg-white text-mv-ink-soft hover:bg-mv-cream"
                  )}
                >
                  <Users size={14} />
                  <span className="hidden sm:inline">Équipe</span>
                </TooltipTrigger>
                <TooltipContent side="bottom">{showMembers ? "Masquer la liste des membres" : "Afficher la liste des membres"}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Pinned banner */}
          {channelPinned.length > 0 && (
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-2">
              <Pin size={13} className="text-amber-600 shrink-0" />
              <p className="text-[12px] text-amber-700 font-medium line-clamp-1">
                <span className="font-semibold">{channelPinned[channelPinned.length - 1].authorName} :</span>{" "}
                {channelPinned[channelPinned.length - 1].content}
              </p>
            </div>
          )}

          {/* Message stream */}
          <div className="flex-1 overflow-y-auto py-4">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <div className="h-14 w-14 rounded-2xl bg-mv-cream flex items-center justify-center border border-mv-border">
                  <MessageSquare size={24} className="text-mv-ink-faint" />
                </div>
                <p className="text-[14px] font-medium text-mv-ink">Aucun message dans #{activeChannel}</p>
                <p className="text-[12.5px] text-mv-ink-faint">Soyez le premier à écrire !</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 h-px bg-mv-border-soft" />
                    <span className="text-[11px] font-medium text-mv-ink-faint px-2">{group.label}</span>
                    <div className="flex-1 h-px bg-mv-border-soft" />
                  </div>
                  {group.messages.map((msg) => (
                    <MessageRow
                      key={msg.id}
                      msg={msg}
                      isSelf={msg.authorId === currentUserId}
                      canDelete={
                        msg.authorId === currentUserId ||
                        role === "owner" ||
                        role === "manager"
                      }
                      onReact={handleReact}
                      onReply={setReplyingTo}
                      onPin={handlePin}
                      onDelete={handleDelete}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              ))
            )}

            {typingUsers.length > 0 && (
              <div className="px-4 py-1 flex items-center gap-2 text-[12px] text-mv-ink-faint">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-mv-ink-faint animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                {typingUsers.join(", ")} {typingUsers.length === 1 ? "est en train d'écrire…" : "sont en train d'écrire…"}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-mv-border bg-white px-4 py-3 shrink-0">
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 rounded-lg bg-mv-green/8 border border-mv-green/20 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply size={13} className="text-mv-green-dark shrink-0" />
                  <span className="text-[12px] text-mv-green-dark font-medium shrink-0">{replyingTo.authorName} :</span>
                  <span className="text-[12px] text-mv-ink-soft truncate">{replyingTo.content}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-mv-ink-faint hover:text-mv-ink ml-2 shrink-0">
                  <X size={14} />
                </button>
              </div>
            )}

            {showMentionPopover && mentionSuggestions.length > 0 && (
              <div className="mb-2 rounded-xl border border-mv-border bg-white shadow-lg overflow-hidden">
                <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint border-b border-mv-border-soft">
                  Mentionner
                </div>
                {mentionSuggestions.slice(0, 6).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => insertMention(s.name)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-mv-cream text-left transition-colors"
                  >
                    {s.isAI ? <FlowAIAvatar size={28} /> : <Avatar name={s.name} size={28} />}
                    <div>
                      <div className="text-[13px] font-medium text-mv-ink">@{s.name}</div>
                      <div className="text-[11px] text-mv-ink-faint">{s.isAI ? "Assistant IA d'équipe" : s.role}</div>
                    </div>
                    {s.isAI && (
                      <span className="ml-auto text-[10px] font-semibold text-mv-green-dark bg-mv-green/10 px-1.5 py-0.5 rounded-full">IA</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-end gap-2">
              <div className="flex-1 flex flex-col rounded-xl border border-mv-border bg-[#fafaf9] focus-within:border-mv-green focus-within:bg-white transition-all shadow-sm overflow-hidden">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputContent}
                  onChange={(e) => {
                    handleInputChange(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${activeChannel}… (Shift+Enter pour sauter une ligne, @ pour mentionner)`}
                  className="flex-1 resize-none bg-transparent px-4 pt-3 pb-1 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint focus:outline-none min-h-[42px] max-h-[120px]"
                  style={{ height: "42px" }}
                />
                <div className="flex items-center gap-1 px-3 pb-2 pt-1">
                  <Tooltip>
                    <TooltipTrigger type="button" onClick={() => insertMention("FlowAI")} className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-green-dark transition-colors">
                      <AtSign size={15} />
                    </TooltipTrigger>
                    <TooltipContent side="top">Mentionner @FlowAI</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger type="button" onClick={() => toast.info("Upload de fichiers bientôt disponible.")} className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink transition-colors">
                      <Paperclip size={15} />
                    </TooltipTrigger>
                    <TooltipContent side="top">Joindre un fichier</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger type="button" onClick={() => { setIsRecording((p) => !p); toast.info(isRecording ? "Enregistrement arrêté." : "Enregistrement en cours…"); }} className={cn("flex items-center justify-center h-7 w-7 rounded-lg transition-colors", isRecording ? "bg-red-100 text-red-500 hover:bg-red-200" : "hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink")}>
                      {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                    </TooltipTrigger>
                    <TooltipContent side="top">{isRecording ? "Arrêter l'enregistrement" : "Enregistrement audio"}</TooltipContent>
                  </Tooltip>
                  <div className="flex-1" />
                  <Tooltip>
                    <TooltipTrigger type="submit" disabled={!inputContent.trim()} className="flex h-8 items-center gap-1.5 rounded-lg bg-mv-green px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-40 hover:bg-mv-green-dark transition-all">
                      <Send size={13} />
                      <span>Envoyer</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">Envoyer (Entrée)</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right Members Sidebar ── */}
        {showMembers && (
          <div className="w-56 border-l border-mv-border bg-white flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-mv-border">
              <span className="text-[12px] font-semibold text-mv-ink-soft uppercase tracking-wider">
                Équipe ({teamMembers.length})
              </span>
              {onInvite && (
                <Tooltip>
                  <TooltipTrigger onClick={onInvite} className="flex items-center justify-center h-6 w-6 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-green-dark transition-colors">
                    <Plus size={14} />
                  </TooltipTrigger>
                  <TooltipContent side="left">Inviter un collaborateur</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* FlowAI */}
            <div className="px-3 py-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1.5 px-1">Bots</p>
              <Tooltip>
                <TooltipTrigger onClick={() => insertMention("FlowAI")} className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-mv-cream transition-colors text-left">
                  <div className="relative shrink-0">
                    <FlowAIAvatar size={32} />
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-mv-green border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-mv-ink truncate">Flow AI</p>
                    <p className="text-[10.5px] text-mv-green-dark font-medium">En ligne</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">Insérer @FlowAI dans le message</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {teamMembers.some((m) => isOnline(m.id)) && (
                <>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1.5 px-1 pt-2">En ligne</p>
                  {teamMembers.filter((m) => isOnline(m.id)).map((m) => (
                    <MemberRow key={m.id} member={m} online={true} onMention={insertMention} />
                  ))}
                </>
              )}
              {teamMembers.some((m) => !isOnline(m.id)) && (
                <>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1.5 px-1 pt-3">Hors ligne</p>
                  {teamMembers.filter((m) => !isOnline(m.id)).map((m) => (
                    <MemberRow key={m.id} member={m} online={false} onMention={insertMention} />
                  ))}
                </>
              )}
            </div>

            {onInvite && (
              <div className="p-3 border-t border-mv-border">
                <button onClick={onInvite} className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-mv-border py-2 text-[12px] text-mv-ink-soft hover:border-mv-green hover:text-mv-green-dark transition-all">
                  <Plus size={13} />
                  Inviter un collaborateur
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Channel Access Drawer */}
      {managingChannel && (
        <ChannelAccessDrawer
          restaurantId={restaurantId}
          channel={managingChannel}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onClose={() => setManagingChannel(null)}
        />
      )}
    </>
  );
}

/* ── Member row ── */
function MemberRow({ member, online, onMention }: { member: TeamMember; online: boolean; onMention: (name: string) => void }) {
  return (
    <Tooltip>
      <TooltipTrigger onClick={() => onMention(member.name.split(" ")[0])} className="w-full flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-mv-cream transition-colors text-left">
        <div className="relative shrink-0">
          <Avatar name={member.name} src={member.avatarUrl} size={30} />
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white", online ? "bg-mv-green" : "bg-mv-border")} />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-mv-ink truncate">{member.name}</p>
          <p className={cn("text-[10px] font-medium truncate", online ? "text-mv-green-dark" : "text-mv-ink-faint")}>
            {online ? "En ligne" : "Hors ligne"}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">Mentionner @{member.name.split(" ")[0]}</TooltipContent>
    </Tooltip>
  );
}
