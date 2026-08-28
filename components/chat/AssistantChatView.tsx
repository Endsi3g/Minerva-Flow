"use client";

import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { CanvasPanel } from "@/components/chat/CanvasPanel";
import { ArtifactCanvas } from "@/components/chat/ArtifactCanvas";
import { ReferralModal } from "@/components/chat/ReferralModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import type { ChatArtifact, ChatConversation, ChatMessage } from "@/lib/types";
import type { CanvasContextData } from "@/components/chat/CanvasDefaultContext";
import type { ActionableArtifactPayload } from "@/lib/types/generative-ui";
import { SAMPLE_MENU_ENGINEERING_ARTIFACT } from "@/lib/ai/sample-artifacts";
import { 
  PanelLeft, 
  PlusCircle, 
  Share2, 
  Bot, 
  AlertTriangle,
  Layers,
  Activity,
  PanelRightClose,
  PanelRight
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
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<"context" | "canvas">("canvas");
  const [actionableArtifact, setActionableArtifact] = useState<ActionableArtifactPayload | null>(
    SAMPLE_MENU_ENGINEERING_ARTIFACT
  );
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

  async function handleApplyArtifact(art: ActionableArtifactPayload) {
    setActionableArtifact({ ...art, isApplied: true });
  }

  const activeAlertCount = defaultContext.alerts.length;

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#FAF8F5] border-t border-[#E8E5DF] text-[#1F1E1D]">
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
        <div className="flex h-14 items-center justify-between border-b border-[#E8E5DF] bg-white/80 backdrop-blur-md px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label="Masquer ou afficher le panneau latéral"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A5851] hover:bg-black/[0.04] hover:text-[#1F1E1D] transition-colors"
              >
                <PanelLeft size={16} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Masquer / Afficher la barre latérale</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2">
              <span className="font-sans font-bold text-sm sm:text-[15px] text-[#0A3F2F] tracking-tight">
                Flow Copilot
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
                <Bot size={11} className="text-emerald-700" />
                Gemini 3.7 Flash
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher in Header (Context vs Canvas) */}
            <div className="hidden md:flex items-center bg-[#FAF8F5] border border-[#E8E5DF] rounded-xl p-0.5 text-xs font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => { setRightPanelView("canvas"); setCanvasCollapsed(false); }}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                  rightPanelView === "canvas" && !canvasCollapsed
                    ? "bg-white text-[#0A3F2F] shadow-2xs"
                    : "text-[#8A887F] hover:text-[#1F1E1D]"
                )}
              >
                <Layers size={12} className="text-[#0E7C5A]" />
                <span>Artefact Canvas</span>
              </button>
              <button
                type="button"
                onClick={() => { setRightPanelView("context"); setCanvasCollapsed(false); }}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all",
                  rightPanelView === "context" && !canvasCollapsed
                    ? "bg-white text-[#0A3F2F] shadow-2xs"
                    : "text-[#8A887F] hover:text-[#1F1E1D]"
                )}
              >
                <Activity size={12} className="text-[#0E7C5A]" />
                <span>Données POS</span>
              </button>
            </div>

            {activeAlertCount > 0 && (
              <div 
                onClick={() => handleSendPrompt("Analyse nos alertes d'exploitation actives et propose un plan de résolution immédiat.")}
                className="hidden lg:flex items-center gap-1.5 text-[11px] bg-amber-50 text-amber-800 border border-amber-200/90 px-2.5 py-1 rounded-lg font-medium cursor-pointer hover:bg-amber-100/70 transition-colors shadow-2xs"
              >
                <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                <span>{activeAlertCount} point{activeAlertCount > 1 ? "s" : ""} de vigilance</span>
              </div>
            )}

            <Tooltip>
              <TooltipTrigger
                onClick={() => setShareOpen(true)}
                aria-label="Partager cette conversation"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A5851] hover:bg-black/[0.04] hover:text-[#1F1E1D] transition-colors"
              >
                <Share2 size={15} />
              </TooltipTrigger>
              <TooltipContent side="bottom">Partager la discussion</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                onClick={() => setCanvasCollapsed(!canvasCollapsed)}
                aria-label="Masquer ou afficher le panneau droit"
                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-[#5A5851] hover:bg-black/[0.04] hover:text-[#1F1E1D] transition-colors"
              >
                {canvasCollapsed ? <PanelRight size={16} /> : <PanelRightClose size={16} />}
              </TooltipTrigger>
              <TooltipContent side="bottom">Masquer / Afficher le Canvas</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                onClick={handleNewChat}
                aria-label="Démarrer une nouvelle discussion"
                className="flex items-center gap-1.5 rounded-xl border border-[#E2E0D8] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#1F1E1D] shadow-2xs hover:bg-[#FAF8F5] transition-all"
              >
                <PlusCircle size={14} className="text-[#0E7C5A]" />
                <span className="hidden sm:inline">Nouveau chat</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">Nouvelle discussion IA</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex sm:hidden border-b border-[#E8E5DF] bg-white">
          <button
            onClick={() => setActiveMobileView("chat")}
            className={cn(
              "flex-1 py-2 text-center font-sans text-xs font-semibold transition-colors",
              activeMobileView === "chat"
                ? "border-b-2 border-[#0E7C5A] text-[#0E7C5A] bg-[#FAF8F5]"
                : "text-[#8A887F] hover:text-[#1F1E1D]"
            )}
          >
            Discussion IA
          </button>
          <button
            onClick={() => setActiveMobileView("canvas")}
            className={cn(
              "flex-1 py-2 text-center font-sans text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
              activeMobileView === "canvas"
                ? "border-b-2 border-[#0E7C5A] text-[#0E7C5A] bg-[#FAF8F5]"
                : "text-[#8A887F] hover:text-[#1F1E1D]"
            )}
          >
            <span>Artefact Canvas</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#0E7C5A] animate-pulse" />
          </button>
        </div>

        {/* Main Split-Screen Layout */}
        <div className="flex flex-1 min-h-0 min-w-0">
          <div
            className={cn(
              "flex-1 flex flex-col min-w-0 bg-[#FAF8F5] h-full relative",
              activeMobileView === "canvas" && "hidden sm:flex"
            )}
          >
            <AssistantRuntimeProvider runtime={runtime}>
              <Thread userName={firstName} />
            </AssistantRuntimeProvider>
          </div>

          {/* Canvas Right Panel with Dual Mode (ArtifactCanvas vs CanvasPanel) */}
          {!canvasCollapsed && (
            <div
              className={cn(
                "w-full sm:w-[420px] lg:w-[480px] border-l border-[#E8E5DF] bg-white flex-col h-full shrink-0 transition-all duration-200",
                activeMobileView === "canvas" ? "flex" : "hidden sm:flex"
              )}
            >
              {rightPanelView === "canvas" ? (
                <ArtifactCanvas
                  artifact={actionableArtifact}
                  onClose={() => setCanvasCollapsed(true)}
                  onApply={handleApplyArtifact}
                  onSendPrompt={handleSendPrompt}
                />
              ) : (
                <CanvasPanel
                  artifact={initialArtifact}
                  defaultContext={defaultContext}
                  onSendPrompt={handleSendPrompt}
                  restaurantId={restaurantId}
                  conversationId={conversationId}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <ReferralModal open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
