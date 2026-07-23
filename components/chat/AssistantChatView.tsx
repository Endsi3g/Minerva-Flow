"use client";

import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { CanvasPanel } from "@/components/chat/CanvasPanel";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ReferralModal } from "@/components/chat/ReferralModal";
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
import { Bot, PanelLeft, Sparkles, FileText, Plus, BarChart2, TrendingUp, Code2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/app-context";
import { updateConversationTitleAction } from "@/app/[locale]/(chat)/assistant/actions";

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
  const hasAnyMessages = initialMessages.length > 0 || messages.length > 0;

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

  function handleSubmit(text: string, attachments: { path: string; fileName: string; mimeType: string; sizeBytes: number; signedUrl: string }[]) {
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
    <div className="flex h-full w-full overflow-hidden bg-mv-surface">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={conversationId}
        onShare={() => setShareOpen(true)}
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
      />

      <div className="flex flex-1 min-w-0 overflow-hidden relative">
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Afficher la barre latérale"
            className="absolute left-2 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
          >
            <PanelLeft size={16} />
          </button>
        )}

        <div
          className={cn(
            "flex flex-1 flex-col px-4 md:px-12 py-6 min-w-0 h-full overflow-hidden transition-all duration-300",
            currentArtifact && activeMobileView === "canvas" ? "hidden md:flex" : "flex"
          )}
        >
          {currentArtifact && (
            <div className="flex border border-mv-border/80 md:hidden bg-mv-cream-soft rounded-full mb-4 p-0.5 shadow-mv-sm">
              <button
                onClick={() => setActiveMobileView("chat")}
                className={cn(
                  "flex-1 py-1.5 text-center text-[12px] font-semibold rounded-full transition-all",
                  activeMobileView === "chat" ? "bg-mv-green text-mv-cream-soft shadow-mv-sm" : "text-mv-ink-faint"
                )}
              >
                Discussion
              </button>
              <button
                onClick={() => setActiveMobileView("canvas")}
                className={cn(
                  "flex-1 py-1.5 text-center text-[12px] font-semibold rounded-full transition-all truncate px-2",
                  activeMobileView === "canvas" ? "bg-mv-green text-mv-cream-soft shadow-mv-sm" : "text-mv-ink-faint"
                )}
              >
                Rapport : {currentArtifact.title}
              </button>
            </div>
          )}

          {!hasAnyMessages ? (
            <div className="flex flex-1 flex-col items-start justify-center max-w-4xl mx-auto w-full py-8">
              {/* Gemini Advanced Gradient Welcome Typography */}
              <div className="mb-10 text-left">
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-rose-500 bg-clip-text text-transparent">
                    Bonjour, {firstName}
                  </span>
                </h1>
                <h2 className="text-3xl md:text-4xl font-medium text-mv-ink-faint/70 mt-2">
                  Comment puis-je vous aider aujourd&apos;hui ?
                </h2>
              </div>

              {/* Gemini Advanced 4 Rich Visual Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {GEMINI_SUGGESTIONS.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => handleSubmit(item.prompt, [])}
                    className="group relative flex flex-col justify-between rounded-2xl border border-mv-border-soft bg-mv-cream-soft/60 p-4.5 text-left transition-all duration-200 hover:border-mv-green/40 hover:bg-mv-surface hover:shadow-mv-md h-52"
                  >
                    <div>
                      <h3 className="text-[13.5px] font-bold leading-snug text-mv-ink group-hover:text-mv-green-dark transition-colors">
                        {item.title}
                      </h3>
                    </div>

                    {/* Rich Visual Illustration per Card Type (Gemini Style) */}
                    <div className="mt-4 flex flex-1 items-center justify-center rounded-xl bg-mv-surface border border-mv-border-soft p-3 overflow-hidden group-hover:border-mv-green/20 transition-colors">
                      {item.type === "code" && (
                        <div className="w-full text-[10px] font-mono text-mv-ink-faint space-y-1">
                          <div className="flex justify-between text-mv-green-dark font-semibold">
                            <span>revenus_semaine = &#123;</span>
                          </div>
                          <div className="pl-2">ventes: 14850.00,</div>
                          <div className="pl-2 text-mv-amber">marge_brute: 68.4%</div>
                          <div>&#125;</div>
                        </div>
                      )}

                      {item.type === "pdf" && (
                        <div className="relative flex flex-col items-center justify-center text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mv-red/10 text-mv-red">
                            <FileText size={20} />
                          </div>
                          <span className="mt-1 text-[9.5px] font-bold uppercase text-mv-red">PDF</span>
                          <span className="absolute -right-2 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-mv-green text-mv-cream-soft shadow-mv-sm">
                            <Plus size={12} />
                          </span>
                        </div>
                      )}

                      {item.type === "plan" && (
                        <div className="w-full text-[10.5px] text-mv-ink-soft space-y-1">
                          <div className="font-semibold text-mv-ink">Plan de menu :</div>
                          <div className="text-[9.5px] text-mv-ink-faint line-clamp-2">
                            1. Plats Étoiles (Tartare, Burger Gourmet)<br />
                            2. Optimisation des coûts
                          </div>
                        </div>
                      )}

                      {item.type === "chart" && (
                        <div className="flex items-end justify-center gap-1.5 h-12 w-full px-2">
                          <div className="w-2.5 h-[40%] bg-mv-green/40 rounded-t-sm" />
                          <div className="w-2.5 h-[65%] bg-mv-green/60 rounded-t-sm" />
                          <div className="w-2.5 h-[90%] bg-mv-green rounded-t-sm" />
                          <div className="w-2.5 h-[55%] bg-mv-green/50 rounded-t-sm" />
                          <div className="w-2.5 h-[75%] bg-mv-green-dark rounded-t-sm" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <MessageScrollerProvider>
              <MessageScroller className="flex-1">
                <MessageScrollerViewport>
                  <MessageScrollerContent>
                    {initialMessages.map((m) => (
                      <MessageScrollerItem key={m.id}>
                        <MessageBubble role={m.role} text={m.content} attachments={m.attachments} />
                      </MessageScrollerItem>
                    ))}
                    {messages.map((m) => {
                      const text = m.parts
                        .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
                        .map((p) => p.text)
                        .join("");
                      return (
                        <MessageScrollerItem key={m.id}>
                          <MessageBubble role={m.role === "user" ? "user" : "assistant"} text={text} />
                        </MessageScrollerItem>
                      );
                    })}

                    {/* Sleek Shimmer Loading Indicator */}
                    {isLoading && (
                      <MessageScrollerItem scrollAnchor>
                        <div className="flex items-center gap-3 rounded-2xl border border-mv-border-soft bg-mv-surface p-3.5 shadow-mv-sm max-w-md">
                          <Bot size={16} className="animate-spin text-mv-green-dark shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3.5 w-3/4 rounded bg-gradient-to-r from-mv-border-soft via-mv-cream-soft to-mv-border-soft animate-pulse" />
                            <div className="h-3 w-1/2 rounded bg-gradient-to-r from-mv-border-soft via-mv-cream-soft to-mv-border-soft animate-pulse" />
                          </div>
                        </div>
                      </MessageScrollerItem>
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          )}

          {/* Gemini Floating Input Bar Container */}
          <div className="w-full max-w-4xl mx-auto mt-auto pt-2">
            <ChatInput
              restaurantId={restaurantId}
              conversationId={conversationId}
              isLoading={isLoading}
              onSubmit={handleSubmit}
            />
            <p className="mt-2 text-center text-[11px] text-mv-ink-faint">
              Minerva Flow peut afficher des prévisions et analyses d&apos;exploitation — vérifiez toujours les chiffres importants.
            </p>
          </div>

          {error && (
            <p className="mt-2 text-center text-[12px] text-mv-red">
              Une erreur est survenue — réessayez dans un instant.
            </p>
          )}
        </div>

        <div
          className={cn(
            "h-full border-l border-mv-border-soft overflow-y-auto bg-mv-cream-soft transition-all duration-300",
            currentArtifact
              ? (activeMobileView === "canvas" ? "flex flex-1 md:w-[28rem] md:flex-initial" : "hidden md:flex md:w-[28rem]")
              : "hidden"
          )}
        >
          <CanvasPanel
            artifact={currentArtifact}
            defaultContext={defaultContext}
            onClose={() => {
              setActiveMobileView("chat");
            }}
          />
        </div>
      </div>

      <ReferralModal open={shareOpen} onClose={() => setShareOpen(false)} restaurantId={restaurantId} />
    </div>
  );
}
