"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { sendTeamMessageAction } from "@/app/[locale]/(app)/collaborateurs/chat-actions";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import type { TeamChannel, TeamChatMessage, TeamMember } from "@/lib/types";
import {
  MessageSquare,
  Send,
  Bot,
  Bell,
  Sparkles,
  Users,
  Utensils,
  AlertTriangle,
  AtSign,
  ShieldCheck,
  CheckCheck,
} from "lucide-react";
import { useState, useOptimistic, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";

const CHANNELS: { id: TeamChannel; label: string; icon: any; description: string }[] = [
  { id: "general", label: "général", icon: MessageSquare, description: "Échanges d'équipe globaux & annonces" },
  { id: "cuisine", label: "cuisine", icon: Utensils, description: "Coordination préparation & fiches recettes" },
  { id: "service", label: "service", icon: Users, description: "Service en salle, réservations & VIP" },
  { id: "urgences", label: "urgences", icon: AlertTriangle, description: "Absences, imprévus & alertes immédiates" },
];

export function TeamChatView({
  restaurantId,
  initialMessages,
  teamMembers,
}: {
  restaurantId: string;
  initialMessages: TeamChatMessage[];
  teamMembers: TeamMember[];
}) {
  const { authUser, role } = useApp();
  const [activeChannel, setActiveChannel] = useState<TeamChannel>("general");
  const [inputContent, setInputContent] = useState("");
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages for active channel
  const filteredInitial = initialMessages.filter((m) => m.channel === activeChannel);

  // React 19 Optimistic Rendering
  const [optimisticMessages, addOptimisticMessage] = useOptimistic<TeamChatMessage[], TeamChatMessage>(
    filteredInitial,
    (state, newMessage) => [...state, newMessage]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [optimisticMessages, activeChannel]);

  // Request browser notification permissions
  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Votre navigateur ne supporte pas les notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      toast.success("Notifications d'équipe activées avec succès !");
    } else {
      toast.error("Permission de notification refusée.");
    }
  }

  function handleInputChange(val: string) {
    setInputContent(val);
    if (val.endsWith("@")) {
      setShowMentionPopover(true);
    } else if (!val.includes("@")) {
      setShowMentionPopover(false);
    }
  }

  function insertTag(tag: string) {
    setInputContent((prev) => {
      const idx = prev.lastIndexOf("@");
      if (idx !== -1) {
        return prev.slice(0, idx) + `@${tag} `;
      }
      return prev + `@${tag} `;
    });
    setShowMentionPopover(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputContent.trim()) return;

    const content = inputContent.trim();
    setInputContent("");
    setShowMentionPopover(false);

    const authorName = authUser?.fullName || "Collaborateur";
    const authorRole = role || "Membre";

    // 1. Instant Optimistic User Message
    const tempUserMsg: TeamChatMessage = {
      id: `temp-${Date.now()}`,
      restaurantId,
      channel: activeChannel,
      authorId: authUser?.id || "user-current",
      authorName,
      authorRole,
      content,
      createdAt: new Date().toISOString(),
    };

    startTransition(() => {
      addOptimisticMessage(tempUserMsg);
    });

    // 2. Dispatch Server Action & Handle Taggable AI
    const res = await sendTeamMessageAction({
      restaurantId,
      channel: activeChannel,
      authorId: authUser?.id || "user-current",
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
          body: res.aiResponse.content,
          icon: "/icon-192.png",
        });
      }
    }
  }

  return (
    <Card className="border border-mv-border bg-mv-surface shadow-mv-md rounded-2xl overflow-hidden flex flex-col h-[640px]">
      {/* Top Banner & Channels Header */}
      <CardHeader className="border-b border-mv-border bg-mv-cream-soft/60 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark border border-mv-green/20 shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <CardTitle className="font-display text-[18px] font-bold text-mv-ink flex items-center gap-2">
              <span>Chat d&apos;Équipe &amp; Assistance @FlowAI</span>
              <Badge tone="green" className="py-0.5 px-2 text-[11px] font-bold">
                Direct
              </Badge>
            </CardTitle>
            <p className="text-[12.5px] text-mv-ink-soft">
              Discutez en direct avec vos collègues et mentionnez <strong className="text-mv-green-dark">@FlowAI</strong> pour obtenir des réponses instantanées.
            </p>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger>
            <button
              onClick={enableNotifications}
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all shadow-mv-sm",
                notificationsEnabled
                  ? "border-mv-green/30 bg-mv-green-tint text-mv-green-dark"
                  : "border-mv-border bg-mv-surface text-mv-ink hover:bg-mv-cream-soft"
              )}
            >
              <Bell size={14} className={notificationsEnabled ? "text-mv-green-dark" : "text-mv-ink-soft"} />
              <span>{notificationsEnabled ? "Notifications Actives" : "Activer les Alertes"}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Recevoir une notification Web Push en cas de mention</TooltipContent>
        </Tooltip>
      </CardHeader>

      {/* Main Body: Channels Sidebar & Chat Stream */}
      <div className="flex flex-1 min-h-0">
        {/* Left Channels List */}
        <div className="w-52 border-r border-mv-border bg-mv-cream/40 p-3 space-y-1 shrink-0 hidden sm:block">
          <div className="px-2 py-1.5 text-[11px] font-bold text-mv-ink-faint uppercase tracking-wider">
            Canaux d&apos;Équipe
          </div>

          {CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-bold transition-all text-left",
                  isActive
                    ? "bg-mv-surface border border-mv-border text-mv-green-dark shadow-mv-sm"
                    : "text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink"
                )}
              >
                <Icon size={16} className={isActive ? "text-mv-green-dark" : "text-mv-ink-faint"} />
                <span>#{ch.label}</span>
              </button>
            );
          })}

          <div className="pt-4 px-2 text-[11px] font-bold text-mv-ink-faint uppercase tracking-wider">
            Bots &amp; Membres
          </div>
          <button
            onClick={() => insertTag("FlowAI")}
            type="button"
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-mv-green-dark hover:bg-mv-green-tint/50 transition-colors text-left"
          >
            <Bot size={14} />
            <span>@FlowAI (Assistant)</span>
          </button>
        </div>

        {/* Right Message Stream */}
        <CardContent className="flex-1 flex flex-col p-4 min-w-0 bg-mv-surface">
          {/* Mobile Channel Switcher */}
          <div className="sm:hidden flex border-b border-mv-border pb-2 mb-3 gap-1 overflow-x-auto">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap",
                  activeChannel === ch.id ? "bg-mv-green text-mv-surface" : "bg-mv-cream text-mv-ink-soft"
                )}
              >
                #{ch.label}
              </button>
            ))}
          </div>

          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {optimisticMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 p-3 rounded-2xl border transition-all max-w-2xl",
                  msg.isAiResponse
                    ? "border-mv-green/30 bg-mv-green-tint/30 text-mv-ink"
                    : "border-mv-border-soft bg-mv-cream-soft/50 text-mv-ink"
                )}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-mv-sm",
                    msg.isAiResponse
                      ? "bg-mv-surface text-mv-green-dark border-mv-green/30"
                      : "bg-mv-ink text-mv-surface border-mv-ink"
                  )}
                >
                  {msg.isAiResponse ? <Bot size={17} /> : msg.authorName.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[13.5px] font-bold text-mv-ink">{msg.authorName}</span>
                    <span className="text-[11px] font-semibold text-mv-ink-faint bg-mv-surface px-1.5 py-0.5 rounded border border-mv-border-soft">
                      {msg.authorRole}
                    </span>
                    <span className="text-[10.5px] text-mv-ink-faint ml-auto">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-[13px] text-mv-ink leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box with Tag Autocomplete */}
          <form onSubmit={handleSendMessage} className="mt-3 relative">
            {/* Mention Popover */}
            {showMentionPopover && (
              <div className="absolute bottom-full mb-2 left-0 w-64 rounded-xl border border-mv-border bg-mv-surface shadow-mv-lg p-2 z-50 space-y-1">
                <div className="text-[11px] font-bold text-mv-ink-faint px-2 py-1 uppercase">
                  Mentionner un membre ou l&apos;IA
                </div>
                <button
                  type="button"
                  onClick={() => insertTag("FlowAI")}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] font-bold text-mv-green-dark hover:bg-mv-green-tint transition-colors text-left"
                >
                  <Bot size={15} />
                  <span>@FlowAI (Assistant IA d&apos;Équipe)</span>
                </button>
                {teamMembers.slice(0, 3).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => insertTag(m.name.split(" ")[0])}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-mv-ink hover:bg-mv-cream-soft transition-colors text-left"
                  >
                    <AtSign size={14} className="text-mv-ink-faint" />
                    <span>@{m.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 bg-mv-cream-soft border border-mv-border rounded-xl p-1.5 focus-within:border-mv-green transition-all shadow-mv-sm">
              <input
                type="text"
                value={inputContent}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Ecrivez dans #${activeChannel}... (Tapez @ pour mentionner @FlowAI)`}
                className="flex-1 bg-transparent px-3 py-1.5 text-[13.5px] text-mv-ink placeholder:text-mv-ink-faint focus:outline-none"
              />

              <Tooltip>
                <TooltipTrigger>
                  <button
                    type="button"
                    onClick={() => insertTag("FlowAI")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-mv-green-dark hover:bg-mv-green-tint transition-colors"
                  >
                    <AtSign size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Taguer @FlowAI</TooltipContent>
              </Tooltip>

              <button
                type="submit"
                disabled={!inputContent.trim()}
                className="flex h-9 px-4 items-center justify-center gap-1.5 rounded-lg bg-mv-green text-mv-surface font-bold text-[12.5px] hover:bg-mv-green-dark disabled:opacity-40 transition-all"
              >
                <span>Envoyer</span>
                <Send size={14} />
              </button>
            </div>
          </form>
        </CardContent>
      </div>
    </Card>
  );
}
