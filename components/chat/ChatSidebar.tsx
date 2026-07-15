"use client";

import { LogoMark } from "@/components/shell/Logo";
import { useApp } from "@/lib/app-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatPresence } from "@/hooks/use-chat-presence";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { createConversationAction } from "@/app/(chat)/assistant/actions";
import type { ChatConversation } from "@/lib/types";
import { PanelLeft, Plus, Share2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

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

  // Auto-collapse once on mobile (limited screen space) — user can still
  // expand it manually afterwards without it snapping shut again.
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
        <div className="flex h-14 items-center justify-between border-b border-mv-border px-3">
          <Link href="/overview" className="flex items-center gap-2 rounded-lg p-1 hover:bg-mv-ink/5">
            <LogoMark size={24} />
            <span className="font-display text-[15.5px] font-semibold text-mv-ink">Minerva Flow</span>
          </Link>
          <button
            onClick={() => onCollapse(true)}
            aria-label="Réduire la barre latérale"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
          >
            <PanelLeft size={16} />
          </button>
        </div>

        <div className="px-2.5 pt-3">
          <button
            onClick={handleNewConversation}
            disabled={isPending}
            className="flex w-full items-center gap-2 rounded-lg border border-mv-border bg-mv-surface px-2.5 py-2 text-[13px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-cream-soft disabled:opacity-50"
          >
            <Plus size={15} /> Nouvelle conversation
          </button>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
          {conversations.map((c) => {
            const active = c.id === activeConversationId;
            return (
              <Link
                key={c.id}
                href={`/assistant/${c.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-mv-green text-mv-cream-soft font-semibold"
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
          })}
        </div>

        <div className="border-t border-mv-border p-2.5">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mv-ink-faint">
              Membres actifs
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
              <p className="text-[12px] text-mv-ink-faint">Personne d&apos;autre en ligne</p>
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
