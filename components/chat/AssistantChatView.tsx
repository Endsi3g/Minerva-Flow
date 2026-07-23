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
import { Bot, PanelLeft, Sparkles, TrendingUp, Utensils, Users, PackageCheck } from "lucide-react";
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

const FEATURED_SUGGESTIONS = [
  {
    icon: TrendingUp,
    label: "Analyse des revenus",
    prompt: "Génère un rapport d'analyse des revenus et des tendances de cette semaine avec les moments forts.",
  },
  {
    icon: Utensils,
    label: "Ingénierie de menu & marges",
    prompt: "Quels sont mes plats étoiles et mes poids morts ce mois-ci d'après l'ingénierie de menu ?",
  },
  {
    icon: Users,
    label: "Optimisation de l'équipe",
    prompt: "Résume les heures travaillées et les coûts de paie prévus pour l'équipe cette semaine.",
  },
  {
    icon: PackageCheck,
    label: "Seuils d'inventaire & stocks",
    prompt: "Quels sont les ingrédients en sous-stock ou proche de la rupture d'inventaire ?",
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
    <div className="flex h-full w-full overflow-hidden bg-mv-cream">
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
            "flex flex-1 flex-col p-6 min-w-0 h-full overflow-hidden transition-all duration-300",
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
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center max-w-3xl mx-auto w-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mv-surface text-mv-green-dark shadow-mv-sm border border-mv-border">
                <Sparkles size={24} />
              </div>

              <div>
                <h1 className="font-display text-[22px] font-bold text-mv-ink">
                  Bonjour {firstName}, prêt·e à analyser votre journée ?
                </h1>
                <p className="mt-2 text-[13.5px] leading-relaxed text-mv-ink-soft max-w-lg mx-auto">
                  Posez n'importe quelle question sur vos performances, votre inventaire, votre menu ou vos collaborateurs. L'IA accède en direct à vos données enregistrées sur Flow.
                </p>
              </div>

              {/* Sana AI Featured Prompt Cards Grid (No Emojis) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left pt-2">
                {FEATURED_SUGGESTIONS.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleSubmit(item.prompt, [])}
                      className="group flex flex-col justify-between rounded-2xl border border-mv-border bg-mv-surface p-4 transition-all hover:border-mv-green-dark hover:shadow-mv-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-mv-cream-soft text-mv-green-dark border border-mv-border-soft group-hover:border-mv-green/30 transition-colors">
                          <IconComponent size={16} />
                        </div>
                        <span className="text-[13px] font-bold text-mv-ink group-hover:text-mv-green-dark transition-colors">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-3 text-[12px] leading-relaxed text-mv-ink-soft group-hover:text-mv-ink transition-colors">
                        "{item.prompt}"
                      </p>
                    </button>
                  );
                })}
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

          <ChatInput
            restaurantId={restaurantId}
            conversationId={conversationId}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
          {error && (
            <p className="mt-2 text-[12px] text-mv-red">
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
