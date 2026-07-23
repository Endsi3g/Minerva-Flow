"use client";

import { LogoMark } from "@/components/shell/Logo";
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
  Zap,
  FolderOpen,
  Search,
  Sparkles,
  ArrowUpRight,
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
        "relative flex shrink-0 overflow-hidden border-r border-mv-border bg-mv-cream-soft",
        isMobile && collapsed && "hidden"
      )}
    >
      <motion.div
        className="flex h-full flex-col"
        style={{ width: CHAT_SIDEBAR_WIDTH }}
        animate={{ x: collapsed ? -48 : 0, opacity: collapsed ? 0 : 1 }}
        transition={SPRING}
      >
        {/* Top Header */}
        <div className="flex h-14 items-center justify-between border-b border-mv-border px-3">
          <Link href="/overview" className="flex items-center gap-2 rounded-lg p-1 hover:bg-mv-ink/5">
            <LogoMark size={24} />
            <span className="font-sans text-[15px] font-bold text-mv-ink">Minerva Flow</span>
          </Link>
          <button
            onClick={() => onCollapse(true)}
            aria-label="Réduire la barre latérale"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
          >
            <PanelLeft size={16} />
          </button>
        </div>

        {/* Action Button: New Chat */}
        <div className="px-3 pt-3">
          <button
            onClick={handleNewConversation}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-mv-green px-3 py-2.5 text-[13px] font-bold text-mv-cream-soft shadow-mv-sm transition-all hover:bg-mv-green-dark disabled:opacity-50"
          >
            <Plus size={16} /> Nouvel échange AI
          </button>
        </div>

        {/* Quick Nav Links (Sana AI style) */}
        <div className="space-y-1 px-3 pt-3">
          <Link
            href="/library"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
          >
            <FolderOpen size={15} className="text-mv-green-dark" />
            <span>Bibliothèque d&apos;assets</span>
          </Link>
          <Link
            href="/integrations"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
          >
            <Zap size={15} className="text-mv-amber" />
            <span>Intégrations</span>
          </Link>
        </div>

        {/* Search input in sidebar */}
        <div className="px-3 pt-3">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-mv-ink-faint" />
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-mv-border bg-mv-surface py-1.5 pl-8 pr-2.5 text-[12px] text-mv-ink placeholder-mv-ink-faint focus:border-mv-green-dark focus:outline-none"
            />
          </div>
        </div>

        {/* Conversations History */}
        <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-mv-ink-faint">
            Conversations récents
          </p>
          {filteredConversations.length === 0 ? (
            <p className="px-1 text-[12px] text-mv-ink-faint">Aucune conversation trouvée</p>
          ) : (
            filteredConversations.map((c) => {
              const active = c.id === activeConversationId;
              return (
                <Link
                  key={c.id}
                  href={`/assistant/${c.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors",
                    active
                      ? "bg-mv-green text-mv-cream-soft font-semibold shadow-mv-sm"
                      : "text-mv-ink-soft hover:bg-mv-ink/[0.06] hover:text-mv-ink"
                  )}
                >
                  <MessageSquare
                    size={14}
                    className={cn("shrink-0", active ? "text-mv-cream-soft" : "opacity-60")}
                  />
                  <span className="truncate">{c.title || "Nouvelle conversation"}</span>
                </Link>
              );
            })
          )}
        </div>

        {/* Usage Quota Card (Sana AI style) */}
        <div className="px-3 pb-2">
          <div className="rounded-xl border border-mv-border bg-mv-surface p-3 shadow-mv-sm">
            <div className="flex items-center justify-between text-[11px] font-bold text-mv-ink">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-mv-green-dark" />
                Quota IA Mensuel
              </span>
              <span className="rounded-full bg-mv-green-tint px-2 py-0.5 text-[10px] text-mv-green-dark">
                Actif
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] text-mv-ink-soft">
              Analyses & requêtes illimitées incluses dans votre formule.
            </p>
            <Link
              href="/billing"
              className="mt-2.5 flex items-center justify-center gap-1 rounded-lg bg-mv-cream-soft py-1.5 text-[11px] font-semibold text-mv-ink hover:bg-mv-border/40"
            >
              Gérer l&apos;abonnement <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        {/* Active Members Footer */}
        <div className="border-t border-mv-border p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mv-ink-faint">
              Équipe en ligne
            </p>
            <button
              onClick={onShare}
              aria-label="Partager"
              className="flex h-7 w-7 items-center justify-center rounded-full text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
            >
              <Share2 size={14} />
            </button>
          </div>
          <div className="flex -space-x-2 px-1">
            {members.length === 0 ? (
              <p className="text-[12px] text-mv-ink-faint">Seul·e en ligne</p>
            ) : (
              members.map((m) => (
                <div key={m.userId} className="relative" title={m.name}>
                  <Avatar
                    name={m.name}
                    size={26}
                    src={m.avatarUrl}
                    className="border-2 border-mv-cream-soft"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-mv-cream-soft bg-mv-green" />
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.aside>
  );
}
