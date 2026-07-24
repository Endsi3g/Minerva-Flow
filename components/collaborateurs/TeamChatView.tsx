"use client";

import { useState, useOptimistic, useTransition, useRef, useEffect } from "react";
import { sendTeamMessageAction } from "@/app/[locale]/(app)/collaborateurs/chat-actions";
import { useApp } from "@/lib/app-context";
import { useTeamPresence } from "@/hooks/use-team-presence";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { TeamChannel, TeamChatMessage, TeamMember } from "@/lib/types";
import {
  MessageSquare,
  Send,
  Bot,
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

/* ────────────────────────── single message ──────────────────────── */

function MessageRow({
  msg,
  isSelf,
  onReact,
  onReply,
  onPin,
  currentUserId,
}: {
  msg: TeamChatMessage;
  isSelf: boolean;
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: TeamChatMessage) => void;
  onPin: (msgId: string) => void;
  currentUserId: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const time = new Date(msg.createdAt).toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isAI = msg.isAiResponse;

  return (
    <div
      className={cn("group flex gap-3 px-4 py-1 relative", isSelf ? "flex-row-reverse" : "flex-row")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setEmojiOpen(false); }}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-1">
        {isAI ? (
          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-mv-green/10 border border-mv-green/30 text-mv-green-dark">
            <Bot size={16} />
          </div>
        ) : (
          <Avatar name={msg.authorName} size={32} />
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
            {Object.entries(msg.reactions).map(([emoji, uids]) => (
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
            ))}
          </div>
        )}
      </div>

      {/* Action toolbar (hover) — Base UI TooltipTrigger renders a <button> itself */}
      {hovered && (
        <div
          className={cn(
            "absolute top-0 flex items-center gap-0.5 bg-white border border-mv-border rounded-xl shadow-md px-1.5 py-1 z-20",
            isSelf ? "right-12" : "left-12"
          )}
        >
          {/* Quick emoji reactions */}
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
              onClick={() => onPin(msg.id)}
              className="flex items-center justify-center h-6 w-6 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink transition-colors"
            >
              <Pin size={13} className={msg.isPinned ? "text-mv-amber" : ""} />
            </TooltipTrigger>
            <TooltipContent side="top">{msg.isPinned ? "Épinglé — cliquer pour désépingler" : "Épingler le message"}</TooltipContent>
          </Tooltip>
        </div>
      )}
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
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [localReactions, setLocalReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserId = authUser?.id || "user-current";

  const filteredInitial = initialMessages.filter((m) => m.channel === activeChannel);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic<TeamChatMessage[], TeamChatMessage>(
    filteredInitial,
    (state, msg) => [...state, msg]
  );

  const messagesWithReactions = optimisticMessages.map((msg) => {
    const merged = { ...msg };
    if (localReactions[msg.id]) {
      merged.reactions = { ...(msg.reactions || {}), ...localReactions[msg.id] };
    }
    if (pinnedMessages.has(msg.id)) merged.isPinned = true;
    return merged;
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesWithReactions, activeChannel]);

  const channelPinned = messagesWithReactions.filter((m) => m.isPinned);

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

  function handleReact(msgId: string, emoji: string) {
    setLocalReactions((prev) => {
      const msgReactions = { ...(prev[msgId] || {}) };
      const uids = msgReactions[emoji] ? [...msgReactions[emoji]] : [];
      if (uids.includes(currentUserId)) {
        msgReactions[emoji] = uids.filter((u) => u !== currentUserId);
        if (msgReactions[emoji].length === 0) delete msgReactions[emoji];
      } else {
        msgReactions[emoji] = [...uids, currentUserId];
      }
      return { ...prev, [msgId]: msgReactions };
    });
  }

  function handlePin(msgId: string) {
    setPinnedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const content = inputContent.trim();
    if (!content) return;

    setInputContent("");
    setShowMentionPopover(false);

    const authorName = authUser?.fullName || "Collaborateur";
    const authorRole = role || "Membre";

    const tempUserMsg: TeamChatMessage = {
      id: `temp-${Date.now()}`,
      restaurantId,
      channel: activeChannel,
      authorId: currentUserId,
      authorName,
      authorRole,
      content,
      replyTo: replyingTo
        ? { id: replyingTo.id, authorName: replyingTo.authorName, content: replyingTo.content }
        : undefined,
      createdAt: new Date().toISOString(),
    };

    setReplyingTo(null);

    startTransition(() => {
      addOptimisticMessage(tempUserMsg);
    });

    const res = await sendTeamMessageAction({
      restaurantId,
      channel: activeChannel,
      authorId: currentUserId,
      authorName,
      authorRole,
      content,
    });

    if (res.aiResponse) {
      startTransition(() => {
        addOptimisticMessage(res.aiResponse!);
      });
      if (notificationsEnabled && typeof window !== "undefined" && "Notification" in window) {
        new Notification("Réponse de Flow AI 🤖", {
          body: res.aiResponse.content.slice(0, 100),
          icon: "/icon-192.png",
        });
      }
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

  const groups = groupMessagesByDate(messagesWithReactions);

  const isOnline = (id: string) =>
    Array.isArray(onlineIds) ? onlineIds.includes(id) : (onlineIds as any)?.has?.(id) ?? false;

  return (
    <div className="flex h-[calc(100vh-130px)] min-h-[600px] bg-[#fafaf9] rounded-2xl border border-mv-border overflow-hidden shadow-mv-md">

      {/* ── Main Chat Area ── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-mv-border bg-white px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {CHANNELS.map((ch) => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                return (
                  <Tooltip key={ch.id}>
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
                );
              })}
            </div>
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
                    onReact={handleReact}
                    onReply={setReplyingTo}
                    onPin={handlePin}
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

          {/* Reply banner */}
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

          {/* @Mention Popover */}
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
                  {s.isAI ? (
                    <div className="h-7 w-7 rounded-full flex items-center justify-center bg-mv-green/10 border border-mv-green/30 text-mv-green-dark shrink-0">
                      <Bot size={14} />
                    </div>
                  ) : (
                    <Avatar name={s.name} size={28} />
                  )}
                  <div>
                    <div className="text-[13px] font-medium text-mv-ink">@{s.name}</div>
                    <div className="text-[11px] text-mv-ink-faint">{s.isAI ? "Assistant IA d'équipe" : s.role}</div>
                  </div>
                  {s.isAI && (
                    <span className="ml-auto text-[10px] font-semibold text-mv-green-dark bg-mv-green/10 px-1.5 py-0.5 rounded-full">
                      IA
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
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
              {/* Toolbar row */}
              <div className="flex items-center gap-1 px-3 pb-2 pt-1">
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={() => insertMention("FlowAI")}
                    className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-green-dark transition-colors"
                  >
                    <AtSign size={15} />
                  </TooltipTrigger>
                  <TooltipContent side="top">Mentionner @FlowAI dans le message</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={() => toast.info("Upload de fichiers bientôt disponible.")}
                    className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink transition-colors"
                  >
                    <Paperclip size={15} />
                  </TooltipTrigger>
                  <TooltipContent side="top">Joindre un fichier ou une image</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    onClick={() => {
                      setIsRecording((p) => !p);
                      toast.info(isRecording ? "Enregistrement arrêté." : "Enregistrement en cours…");
                    }}
                    className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-lg transition-colors",
                      isRecording
                        ? "bg-red-100 text-red-500 hover:bg-red-200"
                        : "hover:bg-mv-cream text-mv-ink-faint hover:text-mv-ink"
                    )}
                  >
                    {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
                  </TooltipTrigger>
                  <TooltipContent side="top">{isRecording ? "Arrêter l'enregistrement audio" : "Enregistrer un message vocal"}</TooltipContent>
                </Tooltip>

                <div className="flex-1" />

                <Tooltip>
                  <TooltipTrigger
                    type="submit"
                    disabled={!inputContent.trim()}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-mv-green px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-40 hover:bg-mv-green-dark transition-all"
                  >
                    <Send size={13} />
                    <span>Envoyer</span>
                  </TooltipTrigger>
                  <TooltipContent side="top">Envoyer le message (Entrée)</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Right Members Sidebar ── */}
      {showMembers && (
        <div className="w-56 border-l border-mv-border bg-white flex flex-col shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-mv-border">
            <span className="text-[12px] font-semibold text-mv-ink-soft uppercase tracking-wider">
              Équipe ({teamMembers.length})
            </span>
            {onInvite && (
              <Tooltip>
                <TooltipTrigger
                  onClick={onInvite}
                  className="flex items-center justify-center h-6 w-6 rounded-lg hover:bg-mv-cream text-mv-ink-faint hover:text-mv-green-dark transition-colors"
                >
                  <Plus size={14} />
                </TooltipTrigger>
                <TooltipContent side="left">Inviter un collaborateur</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* FlowAI bot always online */}
          <div className="px-3 py-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1.5 px-1">Bots</p>
            <Tooltip>
              <TooltipTrigger
                onClick={() => insertMention("FlowAI")}
                className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-mv-cream transition-colors text-left"
              >
                <div className="relative shrink-0">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center bg-mv-green/10 border border-mv-green/30 text-mv-green-dark">
                    <Bot size={15} />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-mv-green border-2 border-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-mv-ink truncate">Flow AI</p>
                  <p className="text-[10.5px] text-mv-green-dark font-medium">En ligne</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">Cliquer pour insérer @FlowAI dans votre message</TooltipContent>
            </Tooltip>
          </div>

          {/* Members list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {teamMembers.some((m) => isOnline(m.id)) && (
              <>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1.5 px-1 pt-2">
                  En ligne
                </p>
                {teamMembers.filter((m) => isOnline(m.id)).map((m) => (
                  <MemberRow key={m.id} member={m} online={true} onMention={insertMention} />
                ))}
              </>
            )}
            {teamMembers.some((m) => !isOnline(m.id)) && (
              <>
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-1.5 px-1 pt-3">
                  Hors ligne
                </p>
                {teamMembers.filter((m) => !isOnline(m.id)).map((m) => (
                  <MemberRow key={m.id} member={m} online={false} onMention={insertMention} />
                ))}
              </>
            )}
          </div>

          {/* Invite button */}
          {onInvite && (
            <div className="p-3 border-t border-mv-border">
              <button
                onClick={onInvite}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-mv-border py-2 text-[12px] text-mv-ink-soft hover:border-mv-green hover:text-mv-green-dark transition-all"
              >
                <Plus size={13} />
                Inviter un collaborateur
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Member row in right sidebar ── */
function MemberRow({
  member,
  online,
  onMention,
}: {
  member: TeamMember;
  online: boolean;
  onMention: (name: string) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={() => onMention(member.name.split(" ")[0])}
        className="w-full flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-mv-cream transition-colors text-left"
      >
        <div className="relative shrink-0">
          <Avatar name={member.name} src={member.avatarUrl} size={30} />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
              online ? "bg-mv-green" : "bg-mv-border"
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-mv-ink truncate">{member.name}</p>
          <p className={cn("text-[10px] font-medium truncate", online ? "text-mv-green-dark" : "text-mv-ink-faint")}>
            {online ? "En ligne" : "Hors ligne"}
          </p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">Cliquer pour mentionner @{member.name.split(" ")[0]}</TooltipContent>
    </Tooltip>
  );
}
