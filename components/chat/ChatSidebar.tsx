"use client";

import { useApp } from "@/lib/app-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatPresence } from "@/hooks/use-chat-presence";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { createConversationAction } from "@/app/[locale]/(chat)/assistant/actions";
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
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition, useState } from "react";

const SPRING = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;
const CHAT_SIDEBAR_WIDTH = 280;

export function ChatSidebar({
  conversations,
  activeConversationId,
  onShare,
  collapsed,
  onCollapse,
}: {
  conversations: ChatConversation[];
  activeConversationId: string | null;
  onShare: () => void;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}) {
  const { restaurantId, authUser } = useApp();
  const isMobile = useIsMobile();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const members = useChatPresence(restaurantId, authUser);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isMobile) onCollapse(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  function handleNewConversation() {
    startTransition(async () => {
      const conversation = await createConversationAction(restaurantId);
      if (conversation) router.push(`/assistant/${conversation.id}`);
    });
  }

  const filteredConversations = conversations.filter((c) =>
    c.title ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 0 : CHAT_SIDEBAR_WIDTH }}
      initial={false}
      transition={SPRING}
      className={cn(
        "relative flex shrink-0 overflow-hidden border-r border-mv-border bg-mv-cream-soft select-none",
        isMobile && collapsed && "hidden"
      )}
    >
      <motion.div
        className="flex h-full flex-col justify-between"
        style={{ width: CHAT_SIDEBAR_WIDTH }}
        animate={{ x: collapsed ? -48 : 0, opacity: collapsed ? 0 : 1 }}
        transition={SPRING}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Workspace & Logo Header */}
          <div className="flex h-14 items-center justify-between border-b border-mv-border/80 px-3.5">
            <Link href="/overview" className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-mv-ink/5 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-mv-green text-white flex items-center justify-center font-serif font-bold text-sm shadow-2xs">
                M
              </div>
              <div className="leading-tight">
                <span className="font-sans text-[13.5px] font-bold text-mv-ink block">Minerva Flow</span>
                <span className="text-[10px] text-mv-ink-faint block -mt-0.5">Workspace Restaurant</span>
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

          {/* Primary Action Button: New Chat */}
          <div className="px-3 pt-3">
            <button
              onClick={handleNewConversation}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-mv-green px-3 py-2 text-[12.5px] font-bold text-white shadow-mv-sm transition-all hover:bg-mv-green-dark disabled:opacity-50"
            >
              <Plus size={15} /> <span>Nouvel échange IA</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-3 pt-3">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-mv-ink-faint" />
              <input
                type="text"
                placeholder="Rechercher une analyse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-mv-border/80 bg-mv-surface py-1.5 pl-8 pr-2.5 text-[11.5px] text-mv-ink placeholder-mv-ink-faint focus:border-mv-green focus:bg-mv-surface focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5 px-3 pt-2.5">
            <Link
              href="/library"
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
            >
              <span className="flex items-center gap-2">
                <FolderOpen size={14} className="text-mv-green-dark" />
                <span>Bibliothèque d&apos;assets</span>
              </span>
              <span className="text-[10px] bg-mv-cream text-mv-ink-soft px-1.5 py-0.2 rounded font-mono border border-mv-border/60">
                14
              </span>
            </Link>
            <Link
              href="/integrations"
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
            >
              <span className="flex items-center gap-2">
                <Settings size={14} className="text-mv-amber" />
                <span>Intégrations POS &amp; ERP</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </Link>
          </div>

          {/* Conversations History */}
          <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 min-h-0">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mv-ink-faint flex items-center gap-1">
                <History size={11} /> Historique récent
              </span>
              <span className="text-[10px] font-mono text-mv-ink-faint">{filteredConversations.length}</span>
            </div>
            {filteredConversations.length === 0 ? (
              <p className="px-1 py-2 text-[11.5px] text-mv-ink-faint text-center">
                Aucune conversation
              </p>
            ) : (
              filteredConversations.map((c) => {
                const active = c.id === activeConversationId;
                return (
                  <Link
                    key={c.id}
                    href={`/assistant/${c.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-medium transition-all group",
                      active
                        ? "bg-mv-green text-white font-semibold shadow-mv-sm"
                        : "text-mv-ink-soft hover:bg-mv-ink/[0.06] hover:text-mv-ink"
                    )}
                  >
                    <MessageSquare
                      size={13}
                      className={cn("shrink-0", active ? "text-white" : "opacity-60 group-hover:text-mv-green-dark")}
                    />
                    <span className="truncate">{c.title || "Nouvelle conversation"}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Section: Pro Quota & Active Presence */}
        <div className="p-3 space-y-2.5 border-t border-mv-border/80 bg-mv-cream-soft">
          {/* Usage Quota Card */}
          <div className="rounded-xl border border-mv-border/80 bg-mv-surface p-3 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-mv-ink mb-1">
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-mv-green-dark" />
                Quota Illimité
              </span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-800 border border-emerald-200">
                Pro
              </span>
            </div>
            <p className="text-[10.5px] text-mv-ink-soft leading-tight">
              Analyses de rentabilité &amp; modèles prédictifs activés.
            </p>
          </div>

          {/* Active Members Footer */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-mv-ink-soft">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {members.length === 0 ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-[10.5px]">En ligne</span>
                  </span>
                ) : (
                  members.slice(0, 3).map((m) => (
                    <div key={m.userId} className="relative" title={m.name}>
                      <Avatar
                        name={m.name}
                        size={22}
                        src={m.avatarUrl}
                        className="border border-mv-cream-soft"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={onShare}
              aria-label="Partager avec l'équipe"
              title="Inviter des collaborateurs"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink transition-colors"
            >
              <Share2 size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.aside>
  );
}
