"use client";

import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { CanvasPanel } from "@/components/chat/CanvasPanel";
import { ReferralModal } from "@/components/chat/ReferralModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import type { ChatArtifact, ChatConversation, ChatMessage } from "@/lib/types";
import type { CanvasContextData } from "@/components/chat/CanvasDefaultContext";
import { 
  PanelLeft, 
  PlusCircle, 
  Share2, 
  Bot, 
  AlertTriangle 
} from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { createConversationAction } from "@/app/[locale]/(chat)/assistant/actions";
import { useRouter } from "next/navigation";

export function AssistantChatView({
  restaurantId,
  conversationId,
  conversations,
  initialArtifact,
  defaultContext,
}: {
  restaurantId: string;
  conversationId: string;
  conversations: ChatConversation[];
  initialMessages: ChatMessage[];
  initialArtifact: ChatArtifact | null;
  defaultContext: CanvasContextData;
}) {
  const { authUser } = useApp();
  const router = useRouter();
  const firstName = authUser?.fullName ? authUser.fullName.split(" ")[0] : "Collaborateur";

  const [shareOpen, setShareOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const currentArtifact = initialArtifact;
  const [activeMobileView, setActiveMobileView] = useState<"chat" | "canvas">("chat");

  const runtime = useChatRuntime({
    id: conversationId,
    transport: new AssistantChatTransport({
      api: "/api/ai/chat",
      body: {
        restaurantId,
        conversationId,
      },
    }),
  });

  async function handleNewChat() {
    const conv = await createConversationAction(restaurantId);
    if (conv) router.push(`/assistant/${conv.id}`);
  }

  function handleSendPrompt(promptText: string) {
    if (!promptText.trim()) return;
    runtime.thread.append({
      content: [{ type: "text", text: promptText }],
    });
    setActiveMobileView("chat");
  }

  const activeAlertCount = defaultContext.alerts.length;

  return (
    <div className="flex h-full w-full overflow-hidden bg-mv-cream border-t border-mv-border">
      {/* Left Chat Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={conversationId}
        onShare={() => setShareOpen(true)}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <div className="flex flex-1 min-w-0 overflow-hidden relative flex-col">
        {/* Modern SaaS Header Bar */}
        <div className="flex h-14 items-center justify-between border-b border-mv-border/70 bg-mv-cream-soft/80 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label="Masquer ou afficher le panneau latéral"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink transition-colors"
              >
                <PanelLeft size={16} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Masquer / Afficher le panneau</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2">
              <span className="font-serif text-[15px] font-bold text-mv-ink tracking-tight">Flow Copilot</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
                <Bot size={11} className="text-emerald-700" />
                Gemini 3.7 Flash
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeAlertCount > 0 && (
              <div 
                onClick={() => handleSendPrompt("Analyse nos alertes d'exploitation actives et propose un plan de résolution immédiat.")}
                className="hidden md:flex items-center gap-1.5 text-[11px] bg-amber-50 text-amber-800 border border-amber-200/90 px-2.5 py-1 rounded-lg font-medium cursor-pointer hover:bg-amber-100/70 transition-colors shadow-2xs"
              >
                <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                <span>{activeAlertCount} point{activeAlertCount > 1 ? "s" : ""} de vigilance</span>
              </div>
            )}

            <Tooltip>
              <TooltipTrigger
                onClick={() => setShareOpen(true)}
                aria-label="Partager cette conversation"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink transition-colors"
              >
                <Share2 size={15} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Partager la discussion</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                onClick={handleNewChat}
                aria-label="Démarrer une nouvelle discussion"
                className="flex items-center gap-1.5 rounded-lg border border-mv-border/80 bg-mv-surface px-2.5 py-1 text-[12px] font-semibold text-mv-ink shadow-mv-sm hover:bg-mv-cream-soft transition-all"
              >
                <PlusCircle size={14} className="text-mv-green-dark" />
                <span className="hidden sm:inline">Nouveau chat</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Nouvelle discussion IA</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex sm:hidden border-b border-mv-border bg-mv-cream-soft">
          <button
            onClick={() => setActiveMobileView("chat")}
            className={cn(
              "flex-1 py-2 text-center font-display text-xs font-semibold transition-colors",
              activeMobileView === "chat"
                ? "border-b-2 border-mv-green text-mv-green-dark bg-mv-surface"
                : "text-mv-ink-soft hover:text-mv-ink"
            )}
          >
            Discussion IA
          </button>
          <button
            onClick={() => setActiveMobileView("canvas")}
            className={cn(
              "flex-1 py-2 text-center font-display text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
              activeMobileView === "canvas"
                ? "border-b-2 border-mv-green text-mv-green-dark bg-mv-surface"
                : "text-mv-ink-soft hover:text-mv-ink"
            )}
          >
            <span>Contexte &amp; Rapports</span>
            {currentArtifact && (
              <span className="h-1.5 w-1.5 rounded-full bg-mv-green animate-pulse" />
            )}
          </button>
        </div>

        {/* Main Split-Screen Layout */}
        <div className="flex flex-1 min-h-0 min-w-0">
          <div
            className={cn(
              "flex-1 flex flex-col min-w-0 bg-mv-cream h-full relative",
              activeMobileView === "canvas" && "hidden sm:flex"
            )}
          >
            <AssistantRuntimeProvider runtime={runtime}>
              <Thread userName={firstName} />
            </AssistantRuntimeProvider>
          </div>

          {/* Canvas Right Panel with Dual Mode & Click-to-Prompt */}
          <div
            className={cn(
              "w-full sm:w-[380px] lg:w-[420px] border-l border-mv-border bg-mv-surface flex-col h-full",
              activeMobileView === "canvas" ? "flex" : "hidden sm:flex"
            )}
          >
            <CanvasPanel
              artifact={currentArtifact}
              defaultContext={defaultContext}
              onSendPrompt={handleSendPrompt}
              restaurantId={restaurantId}
              conversationId={conversationId}
            />
          </div>
        </div>
      </div>

      <ReferralModal open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
