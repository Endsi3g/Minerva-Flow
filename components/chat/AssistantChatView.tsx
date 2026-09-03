"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { FlowAiHeaderNav } from "@/components/chat/FlowAiHeaderNav";
import { TipTapCanvas } from "@/components/chat/TipTapCanvas";
import { ArtifactCanvas } from "@/components/chat/ArtifactCanvas";
import { CanvasPanel } from "@/components/chat/CanvasPanel";
import { ReferralModal } from "@/components/chat/ReferralModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import type { ChatArtifact, ChatConversation, ChatMessage, ChatCanvasDoc } from "@/lib/types";
import type { CanvasContextData } from "@/components/chat/CanvasDefaultContext";
import type { ActionableArtifactPayload } from "@/lib/types/generative-ui";
import { SAMPLE_MENU_ENGINEERING_ARTIFACT } from "@/lib/ai/sample-artifacts";
import { getSpecialistById } from "@/lib/ai/specialists";
import {
  Layers,
  FileEdit,
  Activity,
  Sparkles,
  AlertTriangle,
  PanelRight,
  PanelRightClose,
} from "lucide-react";
import { useApp, useCurrentRestaurant } from "@/lib/app-context";
import { useRouter } from "next/navigation";

function toUIMessages(messages: ChatMessage[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }));
}

export function AssistantChatView({
  restaurantId,
  conversationId,
  conversations,
  initialMessages,
  initialArtifact,
  defaultContext,
  initialAgentId = "general",
  initialActiveDossiers = ["menu", "finance", "loyalty", "operations"],
  initialCanvasDoc = null,
}: {
  restaurantId: string;
  conversationId: string;
  conversations: ChatConversation[];
  initialMessages: ChatMessage[];
  initialArtifact: ChatArtifact | null;
  defaultContext: CanvasContextData;
  initialAgentId?: string;
  initialActiveDossiers?: string[];
  initialCanvasDoc?: ChatCanvasDoc | null;
}) {
  const { authUser } = useApp();
  const restaurant = useCurrentRestaurant();
  const router = useRouter();
  const firstName = authUser?.fullName ? authUser.fullName.split(" ")[0] : "Collaborateur";

  const [shareOpen, setShareOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"tiptap" | "artifact" | "context">("tiptap");
  const [activeMobileView, setActiveMobileView] = useState<"chat" | "canvas">("chat");

  const [agentId, setAgentId] = useState(initialAgentId);
  const [activeDossiers, setActiveDossiers] = useState<string[]>(initialActiveDossiers);
  const [currentCanvasDoc, setCurrentCanvasDoc] = useState<ChatCanvasDoc | null>(initialCanvasDoc);

  const specialist = useMemo(() => getSpecialistById(agentId), [agentId]);

  // Initialisation du runtime AI SDK branché à /api/ai/chat avec agentId et activeDossiers
  const runtime = useChatRuntime({
    id: conversationId,
    messages: toUIMessages(initialMessages),
    transport: new AssistantChatTransport({
      api: "/api/ai/chat",
      body: {
        restaurantId,
        conversationId,
        agentId,
        activeDossiers,
      },
    }),
  });

  // Raccourcis clavier : Cmd+B (Sidebar) & Cmd+J (Canvas)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarCollapsed((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setCanvasCollapsed((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSendPrompt(promptText: string) {
    if (!promptText.trim()) return;
    runtime.thread.append({
      content: [{ type: "text", text: promptText }],
    });
    setActiveMobileView("chat");
  }

  const activeAlertCount = defaultContext.alerts.length;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-mv-cream text-mv-ink">
      {/* ── Navigation Principale par Onglets Flow AI ──────────────────────── */}
      <FlowAiHeaderNav
        restaurantName={restaurant?.name}
        activeSpecialistName={specialist.name}
        activeSpecialistAvatar={specialist.avatar}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onToggleCanvas={() => setCanvasCollapsed(!canvasCollapsed)}
      />

      {/* ── Contenu Principal : Volet Sessions + Chat + Volet Canvas ─────────── */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        {/* 1. Volet Gauche : Sessions & Dossiers RAG */}
        <ChatSidebar
          conversations={conversations}
          activeConversationId={conversationId}
          currentAgentId={agentId}
          currentActiveDossiers={activeDossiers}
          onShare={() => setShareOpen(true)}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          onAgentChange={setAgentId}
          onDossiersChange={setActiveDossiers}
        />

        {/* 2. Colonne Centrale : Chat Conversationnel & Prompts Spécialiste */}
        <div
          className={cn(
            "flex flex-1 min-w-0 flex-col bg-[#FAF8F3] h-full relative overflow-hidden",
            activeMobileView === "canvas" && "hidden sm:flex"
          )}
        >
          {/* Bannière du Spécialiste Actif avec Prompts Suggérés Rapides */}
          <div className="flex items-center justify-between px-4 py-2 bg-white/90 border-b border-mv-border-soft shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
              <span className="text-sm shrink-0">{specialist.avatar}</span>
              <span className="text-[12px] font-semibold text-mv-ink shrink-0 mr-2">
                {specialist.name}
              </span>

              {specialist.suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(prompt)}
                  className="px-2.5 py-1 rounded-full bg-[#FAF7F0] hover:bg-mv-cream text-[11px] font-medium text-mv-ink-soft hover:text-mv-ink border border-mv-border-soft shrink-0 transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <Sparkles size={10} className="text-mv-amber" />
                  <span className="truncate max-w-[240px]">{prompt}</span>
                </button>
              ))}
            </div>

            {/* Alertes d'exploitation directes */}
            {activeAlertCount > 0 && (
              <button
                onClick={() =>
                  handleSendPrompt(
                    "Analyse nos alertes d'exploitation en cours et propose un plan d'action d'urgence."
                  )
                }
                className="hidden xl:flex items-center gap-1.5 text-[11px] bg-amber-50 text-amber-900 border border-amber-200/90 px-2.5 py-1 rounded-lg font-medium hover:bg-amber-100 transition-colors shadow-2xs shrink-0 ml-2"
              >
                <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                <span>{activeAlertCount} alertes</span>
              </button>
            )}
          </div>

          {/* Assistant UI Thread */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <AssistantRuntimeProvider runtime={runtime}>
              <Thread userName={firstName} />
            </AssistantRuntimeProvider>
          </div>
        </div>

        {/* 3. Volet Droit : Canvas TipTap WYSIWYG & Visualisations */}
        {!canvasCollapsed && (
          <div
            className={cn(
              "w-full sm:w-[460px] lg:w-[520px] xl:w-[580px] border-l border-mv-border bg-mv-surface flex flex-col h-full shrink-0 transition-all duration-200 z-10",
              activeMobileView === "canvas" ? "flex" : "hidden sm:flex"
            )}
          >
            {/* Sélecteur de mode Canvas */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-mv-border bg-[#FAF8F5] shrink-0">
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-mv-border text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setActiveRightTab("tiptap")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors",
                    activeRightTab === "tiptap"
                      ? "bg-mv-green text-white font-semibold shadow-2xs"
                      : "text-mv-ink-soft hover:text-mv-ink"
                  )}
                >
                  <FileEdit size={12} />
                  <span>Éditeur TipTap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab("artifact")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors",
                    activeRightTab === "artifact"
                      ? "bg-mv-green text-white font-semibold shadow-2xs"
                      : "text-mv-ink-soft hover:text-mv-ink"
                  )}
                >
                  <Layers size={12} />
                  <span>Artefact Carte</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab("context")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors",
                    activeRightTab === "context"
                      ? "bg-mv-green text-white font-semibold shadow-2xs"
                      : "text-mv-ink-soft hover:text-mv-ink"
                  )}
                >
                  <Activity size={12} />
                  <span>Données POS</span>
                </button>
              </div>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setCanvasCollapsed(true)}
                      className="p-1 rounded-lg text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream"
                    >
                      <PanelRightClose size={15} />
                    </button>
                  }
                />
                <TooltipContent>Masquer le volet droit (Cmd+J)</TooltipContent>
              </Tooltip>
            </div>

            {/* Corps du panneau droit */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeRightTab === "tiptap" && (
                <TipTapCanvas
                  restaurantId={restaurantId}
                  conversationId={conversationId}
                  initialDoc={currentCanvasDoc}
                  onDocSaved={setCurrentCanvasDoc}
                />
              )}

              {activeRightTab === "artifact" && (
                <ArtifactCanvas
                  artifact={SAMPLE_MENU_ENGINEERING_ARTIFACT}
                  onClose={() => setCanvasCollapsed(true)}
                  onApply={async () => {}}
                  onSendPrompt={handleSendPrompt}
                />
              )}

              {activeRightTab === "context" && (
                <CanvasPanel
                  artifact={initialArtifact}
                  defaultContext={defaultContext}
                  onSendPrompt={handleSendPrompt}
                  restaurantId={restaurantId}
                  conversationId={conversationId}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ReferralModal open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
