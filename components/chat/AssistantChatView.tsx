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
import { Bot, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

const SUGGESTIONS = [
  "Pourquoi le revenu a baissé mercredi ?",
  "Quel programme a la meilleure marge ?",
  "Quelles alertes traiter en priorité ?",
  "Résume ma semaine en 3 points.",
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
  const [shareOpen, setShareOpen] = useState(false);
  const [currentArtifact, setCurrentArtifact] = useState<ChatArtifact | null>(initialArtifact);
  const [activeMobileView, setActiveMobileView] = useState<"chat" | "canvas">("chat");

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const hasAnyMessages = initialMessages.length > 0 || messages.length > 0;

  // Sync initialArtifact when conversation changes
  useEffect(() => {
    setCurrentArtifact(initialArtifact);
    setActiveMobileView("chat");
  }, [initialArtifact, conversationId]);

  // Monitor messages to detect any real-time "createArtifact" tool calls
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
            // Auto-focus the new canvas view on mobile
            setActiveMobileView("canvas");
          }
        }
      }
    }
  }, [messages, conversationId, restaurantId]);

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
      />

      <div className="flex flex-1 min-w-0 overflow-hidden relative">
        {/* Left Column: Chat Area */}
        <div
          className={cn(
            "flex flex-1 flex-col p-6 min-w-0 h-full overflow-hidden transition-all duration-300",
            currentArtifact && activeMobileView === "canvas" ? "hidden md:flex" : "flex"
          )}
        >
          {/* Mobile view selector */}
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
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark shadow-mv-sm">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="font-display text-[17.5px] font-medium text-mv-ink">
                  Que voulez-vous savoir ?
                </p>
                <p className="mt-1 text-[13px] text-mv-ink-soft">
                  Les réponses s&apos;appuient sur vos données réelles.
                </p>
              </div>
              <div className="flex max-w-md flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSubmit(s, [])}
                    className="rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-cream-soft"
                  >
                    {s}
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
                    {isLoading && (
                      <MessageScrollerItem scrollAnchor>
                        <div className="flex items-center gap-2 text-[12.5px] text-mv-ink-faint">
                          <Bot size={14} className="animate-pulse" /> L&apos;assistant réfléchit…
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

        {/* Right Column: Canvas Area (collapsible on mobile, takes full height) */}
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
