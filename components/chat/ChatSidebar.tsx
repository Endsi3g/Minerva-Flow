"use client";

import React, { useEffect, useTransition, useState } from "react";
import { useApp } from "@/lib/app-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatPresence } from "@/hooks/use-chat-presence";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { createConversationAction } from "@/app/[locale]/(chat)/assistant/actions";
import {
  executeTogglePinAction,
  executeUpdateAgentAction,
} from "@/app/[locale]/(chat)/assistant/flow-ai-actions";
import { FLOW_AI_SPECIALISTS, getSpecialistById } from "@/lib/ai/specialists";
import { FlowAiDossiersDrawer } from "@/components/chat/FlowAiDossiersDrawer";
import type { ChatConversation } from "@/lib/types";
import {
  PanelLeft,
  Plus,
  Share2,
  MessageSquare,
  FolderOpen,
  Search,
  Sparkles,
  History,
  Pin,
  PinOff,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const SPRING = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;
const CHAT_SIDEBAR_WIDTH = 300;

export function ChatSidebar({
  conversations,
  activeConversationId,
  currentAgentId,
  currentActiveDossiers,
  onShare,
  collapsed,
  onCollapse,
  onAgentChange,
  onDossiersChange,
}: {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  currentAgentId?: string;
  currentActiveDossiers?: string[];
  onShare: () => void;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  onAgentChange?: (agentId: string) => void;
  onDossiersChange?: (dossiers: string[]) => void;
}) {
  const { restaurantId, authUser } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const members = useChatPresence(restaurantId, authUser);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState(currentAgentId ?? "general");

  useEffect(() => {
    if (isMobile) onCollapse(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  useEffect(() => {
    if (currentAgentId) setSelectedAgentId(currentAgentId);
  }, [currentAgentId]);

  function handleNewConversation() {
    startTransition(async () => {
      const conversation = await createConversationAction(restaurantId);
      if (conversation) router.push(`/assistant/${conversation.id}`);
    });
  }

  async function handleTogglePin(e: React.MouseEvent, cId: string, currentPin: boolean) {
    e.preventDefault();
    e.stopPropagation();
    const res = await executeTogglePinAction(cId, !currentPin);
    if (res.success) {
      toast.success(currentPin ? "Échange détaché" : "Échange épinglé en haut");
    }
  }

  async function handleSelectAgent(agentId: string) {
    setSelectedAgentId(agentId);
    if (onAgentChange) onAgentChange(agentId);
    if (activeConversationId) {
      await executeUpdateAgentAction(activeConversationId, agentId);
    }
    const specialist = getSpecialistById(agentId);
    toast.success(`Spécialiste activé : ${specialist.name}`);
  }

  const activeSpecialist = getSpecialistById(selectedAgentId);

  const filteredConversations = conversations.filter((c) =>
    c.title ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const recentConversations = filteredConversations.filter((c) => !c.isPinned);

  return (
    <motion.aside
      animate={{ width: collapsed ? 0 : CHAT_SIDEBAR_WIDTH }}
      initial={false}
      transition={SPRING}
      className={cn(
        "relative flex shrink-0 overflow-hidden border-r border-mv-border bg-mv-cream-soft select-none z-20",
        isMobile && collapsed && "hidden"
      )}
    >
      <motion.div
        className="flex h-full flex-col justify-between"
        style={{ width: CHAT_SIDEBAR_WIDTH }}
        animate={{ x: collapsed ? -48 : 0, opacity: collapsed ? 0 : 1 }}
        transition={SPRING}
      >
        <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
          {/* Workspace & Logo Header */}
          <div className="flex h-13 items-center justify-between border-b border-mv-border/80 px-3.5 shrink-0 bg-mv-surface">
            <Link
              href="/overview"
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-mv-ink/5 transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-mv-green text-white flex items-center justify-center font-serif font-bold text-xs shadow-2xs">
                M
              </div>
              <div className="leading-tight">
                <span className="font-sans text-[13px] font-bold text-mv-ink block">Minerva Flow</span>
              </div>
            </Link>
            <button
              onClick={() => onCollapse(true)}
              aria-label="Réduire la barre latérale"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
            >
              <PanelLeft size={15} />
            </button>
          </div>

          {/* Action : Nouveau Chat */}
          <div className="px-3 pt-3 shrink-0">
            <button
              onClick={handleNewConversation}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-mv-green px-3 py-2 text-[12.5px] font-bold text-white shadow-xs transition-all hover:bg-mv-green-dark disabled:opacity-50"
            >
              <Plus size={15} /> <span>Nouvel échange Flow AI</span>
            </button>
          </div>

          {/* Sélecteur de Spécialiste Restaurant */}
          <div className="px-3 pt-2.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center justify-between p-2 rounded-xl border border-mv-border bg-mv-surface hover:border-mv-green transition-colors text-left shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{activeSpecialist.avatar}</span>
                  <div className="truncate">
                    <span className="text-[12px] font-semibold text-mv-ink block truncate leading-tight">
                      {activeSpecialist.name}
                    </span>
                    <span className="text-[10px] text-mv-ink-faint block truncate">
                      {activeSpecialist.badge}
                    </span>
                  </div>
                </div>
                <ChevronDown size={13} className="text-mv-ink-faint shrink-0 ml-1" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[275px] bg-mv-surface border-mv-border">
                <DropdownMenuLabel className="text-[11px] font-bold text-mv-ink-faint uppercase tracking-wider">
                  Changer de Spécialiste
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-mv-border-soft" />
                {FLOW_AI_SPECIALISTS.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => handleSelectAgent(s.id)}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg cursor-pointer",
                      selectedAgentId === s.id && "bg-mv-cream text-mv-green-dark font-medium"
                    )}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{s.avatar}</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-mv-ink truncate">{s.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-mv-cream border border-mv-border-soft text-mv-ink-soft">
                          {s.badge}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-mv-ink-faint line-clamp-1 leading-tight mt-0.5">
                        {s.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Barre de Recherche */}
          <div className="px-3 pt-2 shrink-0">
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-mv-ink-faint" />
              <input
                type="text"
                placeholder="Rechercher une analyse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-mv-border/80 bg-mv-surface py-1.5 pl-8 pr-2.5 text-[11.5px] text-mv-ink placeholder-mv-ink-faint focus:border-mv-green focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Section Dossiers RAG Contextuels */}
          {activeConversationId && (
            <div className="px-3 pt-3 shrink-0">
              <FlowAiDossiersDrawer
                conversationId={activeConversationId}
                restaurantId={restaurantId}
                initialActiveDossiers={currentActiveDossiers}
                onDossiersChange={onDossiersChange}
              />
            </div>
          )}

          {/* Conversations Épinglées */}
          {pinnedConversations.length > 0 && (
            <div className="px-3 pt-3 shrink-0 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mv-ink-faint flex items-center gap-1 px-1">
                <Pin size={10} className="text-mv-amber" /> Épinglés ({pinnedConversations.length})
              </span>
              {pinnedConversations.map((c) => {
                const active = c.id === activeConversationId;
                return (
                  <Link
                    key={c.id}
                    href={`/assistant/${c.id}`}
                    className={cn(
                      "flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-medium transition-all group",
                      active
                        ? "bg-mv-green text-white font-semibold shadow-xs"
                        : "text-mv-ink-soft hover:bg-mv-ink/[0.06] hover:text-mv-ink"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare
                        size={13}
                        className={cn("shrink-0", active ? "text-white" : "opacity-60")}
                      />
                      <span className="truncate">{c.title || "Nouvel échange"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(e, c.id, true)}
                      title="Détacher"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-mv-amber transition-opacity"
                    >
                      <PinOff size={12} />
                    </button>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Historique Récent */}
          <div className="px-3 py-3 space-y-1">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mv-ink-faint flex items-center gap-1">
                <History size={10} /> Récents ({recentConversations.length})
              </span>
            </div>

            {recentConversations.length === 0 && pinnedConversations.length === 0 ? (
              <p className="px-1 py-2 text-[11.5px] text-mv-ink-faint text-center">
                Aucune conversation
              </p>
            ) : (
              recentConversations.map((c) => {
                const active = c.id === activeConversationId;
                return (
                  <Link
                    key={c.id}
                    href={`/assistant/${c.id}`}
                    className={cn(
                      "flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-medium transition-all group",
                      active
                        ? "bg-mv-green text-white font-semibold shadow-xs"
                        : "text-mv-ink-soft hover:bg-mv-ink/[0.06] hover:text-mv-ink"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare
                        size={13}
                        className={cn("shrink-0", active ? "text-white" : "opacity-60")}
                      />
                      <span className="truncate">{c.title || "Nouvel échange"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(e, c.id, false)}
                      title="Épingler en haut"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-mv-amber transition-opacity"
                    >
                      <Pin size={12} />
                    </button>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Pied de page : Statut & Partage */}
        <div className="p-3 border-t border-mv-border/80 bg-mv-surface shrink-0">
          <div className="flex items-center justify-between text-[11px] text-mv-ink-soft">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span className="text-[11px] font-medium">Flow AI Prêt</span>
            </div>
            <button
              onClick={onShare}
              title="Inviter des collaborateurs"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-mv-ink-soft hover:bg-mv-cream hover:text-mv-ink transition-colors"
            >
              <Share2 size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.aside>
  );
}
