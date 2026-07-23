"use client";

import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { CanvasPanel } from "@/components/chat/CanvasPanel";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ReferralModal } from "@/components/chat/ReferralModal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import type { ChatArtifact, ChatConversation, ChatMessage } from "@/lib/types";
import type { CanvasContextData } from "@/components/chat/CanvasDefaultContext";
import { Bot, PanelLeft, Sparkles, FileText, Plus, TrendingUp, Utensils, Users, PackageCheck, PlusCircle, Share2 } from "lucide-react";
import { useState, useEffect, useRef, useOptimistic } from "react";
import { useApp } from "@/lib/app-context";
import { updateConversationTitleAction, createConversationAction } from "@/app/[locale]/(chat)/assistant/actions";
import { useRouter } from "next/navigation";

async function notifyAssistantDone() {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  registration.showNotification("Réponse prête", {
    body: "L'assistant a terminé de répondre.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "assistant-response",
  });
}

// 4 Rich Gemini Advanced Visual Suggestion Cards
const GEMINI_SUGGESTIONS = [
  {
    title: "Analyse des revenus & marges",
    prompt: "Génère un rapport d'analyse des revenus et des tendances de cette semaine avec les moments forts.",
    type: "code",
  },
  {
    title: "Générer un plan opérationnel",
    prompt: "Crée un plan d'action opérationnel pour optimiser les achats et la gestion des stocks de l'établissement.",
    type: "pdf",
  },
  {
    title: "Développer le plan stratégique",
    prompt: "Analyse mes plats étoiles et mes poids morts ce mois-ci d'après l'ingénierie de menu.",
    type: "plan",
  },
  {
    title: "Créer un graphique & métriques",
    prompt: "Compare les ventes quotidiennes et montre l'évolution du panier moyen sous forme de graphique.",
    type: "chart",
  },
];

export function AssistantChatView({
  restaurantId,
  conversationId,
  conversations,
  initialMessages,
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
  const [currentArtifact, setCurrentArtifact] = useState<ChatArtifact | null>(initialArtifact);
  const [activeMobileView, setActiveMobileView] = useState<"chat" | "canvas">("chat");

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const validInitialMessages = initialMessages.filter((m) => m.content && m.content.trim().length > 0);
  const validLiveMessages = messages.filter((m) => {
    const text = m.parts
      ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("");
    return Boolean(text && text.trim().length > 0);
  });
  
  // React 19 Optimistic Rendering hook for immediate message feedback
  const [optimisticMessages, addOptimisticMessage] = useOptimistic<ChatMessage[], string>(
    validInitialMessages,
    (currentMessages, newPromptText) => [
      ...currentMessages,
      {
        id: `optimistic-${Date.now()}`,
        conversationId,
        restaurantId,
        authorId: authUser?.id ?? null,
        role: "user",
        content: newPromptText,
        createdAt: new Date().toISOString(),
      },
    ]
  );

  const hasAnyMessages = optimisticMessages.length > 0 || validLiveMessages.length > 0;

  const prevStatusRef = useRef(status);
  useEffect(() => {
    const wasLoading = prevStatusRef.current === "submitted" || prevStatusRef.current === "streaming";
    if (wasLoading && status === "ready" && document.hidden) {
      notifyAssistantDone();
    }
    prevStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    setCurrentArtifact(initialArtifact);
    setActiveMobileView("chat");
  }, [initialArtifact, conversationId]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.parts) {
      for (const part of lastMessage.parts) {
        if (part.type === "tool-createArtifact") {
          const input = (part as any).input;
          if (input && input.type && input.title && input.data) {
            setCurrentArtifact({
              id: (part as any).toolCallId,
              conversationId,
              restaurantId,
              messageId: lastMessage.id,
              type: input.type,
              title: input.title,
              data: input.data,
              createdAt: new Date().toISOString(),
            });
            setActiveMobileView("canvas");
          }
        }
      }
    }
  }, [messages, conversationId, restaurantId]);

  // Auto-generate title on first prompt
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "user") {
      const firstText = messages[0].parts
        ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
        .map((p) => p.text)
        .join("") || "Nouvelle conversation";
      
      const generatedTitle = firstText.length > 30 ? `${firstText.slice(0, 30)}...` : firstText;
      updateConversationTitleAction(conversationId, generatedTitle);
    }
  }, [messages, conversationId]);

  async function handleNewChat() {
    const conv = await createConversationAction(restaurantId);
    if (conv) router.push(`/assistant/${conv.id}`);
  }

  function handleSubmit(text: string, attachments: { path: string; fileName: string; mimeType: string; sizeBytes: number; signedUrl: string }[]) {
    // 1. Instant Optimistic Rendering update
    addOptimisticMessage(text);

    // 2. Real AI SDK dispatch
    const files: FileUIPart[] = attachments.map((a) => ({
      type: "file",
      mediaType: a.mimeType,
      filename: a.fileName,
      url: a.signedUrl,
    }));

    sendMessage(
      { text, files: files.length > 0 ? files : undefined },
      {
        body: {
          restaurantId,
          conversationId,
          attachments: attachments.map((a) => ({
            path: a.path,
            fileName: a.fileName,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
          })),
        },
      }
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-mv-cream border-t border-mv-border">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={conversationId}
        onShare={() => setShareOpen(true)}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <div className="flex flex-1 min-w-0 overflow-hidden relative flex-col">
        {/* Gemini Top Header Bar */}
        <div className="flex h-14 items-center justify-between border-b border-mv-border bg-mv-cream-soft/90 px-4">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  aria-label="Masquer ou afficher le panneau latéral"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink transition-colors"
                >
                  <PanelLeft size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Masquer / Afficher le panneau</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2">
              <span className="font-display text-[15px] font-bold text-mv-ink">Minerva Flow AI</span>
              <span className="rounded-full bg-mv-green-tint px-2.5 py-0.5 text-[11px] font-bold text-mv-green-dark border border-mv-green/20">
                Gemini 2.5
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <button
                  onClick={() => setShareOpen(true)}
                  aria-label="Partager cette conversation"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink transition-colors"
                >
                  <Share2 size={17} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Partager la conversation</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <button
                  onClick={handleNewChat}
                  aria-label="Démarrer une nouvelle discussion"
                  className="flex items-center gap-1.5 rounded-lg border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-bold text-mv-ink shadow-mv-sm hover:bg-mv-cream-soft transition-all"
                >
                  <PlusCircle size={15} className="text-mv-green-dark" />
                  <span>Nouveau chat</span>
                </button>
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
              "flex-1 py-2 text-center font-display text-xs font-bold transition-colors",
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
              "flex-1 py-2 text-center font-display text-xs font-bold transition-colors flex items-center justify-center gap-1.5",
              activeMobileView === "canvas"
                ? "border-b-2 border-mv-green text-mv-green-dark bg-mv-surface"
                : "text-mv-ink-soft hover:text-mv-ink"
            )}
          >
            <span>Rapports &amp; Canvas</span>
            {currentArtifact && (
              <span className="h-2 w-2 rounded-full bg-mv-green animate-pulse" />
            )}
          </button>
        </div>

        {/* Main Conversation Container */}
        <div className="flex flex-1 min-h-0 min-w-0">
          <div
            className={cn(
              "flex-1 flex flex-col min-w-0 bg-mv-cream h-full relative",
              activeMobileView === "canvas" && "hidden sm:flex"
            )}
          >
            <MessageScrollerProvider>
              <MessageScroller className="flex-1">
                <MessageScrollerViewport className="p-4 sm:p-6">
                  <MessageScrollerContent className="max-w-3xl mx-auto space-y-6">
                    {/* Gemini Advanced Welcome Title & 4 Visual Suggestion Cards */}
                    {!hasAnyMessages && (
                      <div className="pt-8 pb-4 space-y-8 max-w-2xl mx-auto">
                        <div className="space-y-2 text-left">
                          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-mv-ink">
                            Bonjour, <span className="text-mv-green-dark font-serif italic">{firstName}</span>
                          </h1>
                          <p className="font-display text-xl sm:text-2xl font-semibold text-mv-ink-soft">
                            Comment puis-je vous aider aujourd&apos;hui ?
                          </p>
                        </div>

                        {/* 4 Rich Visual Illustration Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                          {GEMINI_SUGGESTIONS.map((card, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSubmit(card.prompt, [])}
                              aria-label={`Prompt suggéré: ${card.title}`}
                              className="group flex flex-col justify-between p-4 rounded-2xl border border-mv-border bg-mv-surface text-left transition-all duration-200 hover:border-mv-green/40 hover:shadow-mv-md hover:-translate-y-0.5"
                            >
                              <div className="space-y-2">
                                <span className="font-display text-[14.5px] font-bold text-mv-ink group-hover:text-mv-green-dark transition-colors">
                                  {card.title}
                                </span>
                                <p className="text-[12.5px] text-mv-ink-soft leading-relaxed line-clamp-2">
                                  {card.prompt}
                                </p>
                              </div>

                              <div className="mt-4 flex items-center justify-between text-mv-ink-faint group-hover:text-mv-green-dark">
                                <span className="text-[11px] font-medium">Cliquer pour exécuter</span>
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-mv-cream-soft text-mv-ink-soft group-hover:bg-mv-green-tint group-hover:text-mv-green-dark transition-colors">
                                  {card.type === "code" && <TrendingUp size={15} />}
                                  {card.type === "pdf" && <PackageCheck size={15} />}
                                  {card.type === "plan" && <Utensils size={15} />}
                                  {card.type === "chart" && <FileText size={15} />}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optimistic User Messages & Saved Initial Messages */}
                    {optimisticMessages.map((m) => (
                      <MessageScrollerItem key={m.id}>
                        <MessageBubble message={m} />
                      </MessageScrollerItem>
                    ))}

                    {/* AI SDK Live Messages */}
                    {messages.map((m) => {
                      const text = m.parts
                        ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
                        .map((p) => p.text)
                        .join("");
                      if (!text && (!m.parts || m.parts.length === 0)) return null;

                      return (
                        <MessageScrollerItem key={m.id}>
                          <MessageBubble
                            message={{
                              id: m.id,
                              conversationId,
                              restaurantId,
                              authorId: authUser?.id ?? null,
                              role: m.role as "user" | "assistant",
                              content: text || "",
                              createdAt: new Date().toISOString(),
                            }}
                          />
                        </MessageScrollerItem>
                      );
                    })}

                    {isLoading && (
                      <MessageScrollerItem>
                        <div className="flex items-center gap-3 text-mv-ink-soft py-2 px-4 bg-mv-surface border border-mv-border rounded-xl w-fit shadow-mv-sm">
                          <Bot size={18} className="text-mv-green-dark animate-spin" />
                          <span className="text-[13px] font-medium animate-pulse">
                            Minerva Flow AI analyse les données d&apos;exploitation...
                          </span>
                        </div>
                      </MessageScrollerItem>
                    )}

                    {error && (
                      <MessageScrollerItem>
                        <div className="p-3.5 rounded-xl border border-mv-red/30 bg-mv-red-bg text-mv-red text-xs font-medium">
                          Une erreur est survenue lors de la réponse IA. Veuillez réessayer.
                        </div>
                      </MessageScrollerItem>
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>

            {/* Chat Floating Pill Input Bar */}
            <div className="p-3 sm:p-4 bg-mv-cream border-t border-mv-border-soft">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  restaurantId={restaurantId}
                  conversationId={conversationId}
                  isLoading={isLoading}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          </div>

          {/* Canvas Right Panel */}
          <div
            className={cn(
              "w-full sm:w-[480px] lg:w-[540px] border-l border-mv-border bg-mv-surface flex-col h-full",
              activeMobileView === "canvas" ? "flex" : "hidden sm:flex"
            )}
          >
            <CanvasPanel
              artifact={currentArtifact}
              defaultContext={defaultContext}
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
