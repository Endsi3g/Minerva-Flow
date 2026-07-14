"use client";

import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { CanvasPanel } from "@/components/chat/CanvasPanel";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ReferralModal } from "@/components/chat/ReferralModal";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import type { ChatArtifact, ChatConversation, ChatMessage } from "@/lib/types";
import { Bot, Sparkles } from "lucide-react";
import { useState } from "react";

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
}: {
  restaurantId: string;
  conversationId: string;
  conversations: ChatConversation[];
  initialMessages: ChatMessage[];
  initialArtifact: ChatArtifact | null;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const hasAnyMessages = initialMessages.length > 0 || messages.length > 0;

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
    <div className="flex h-full">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={conversationId}
        onShare={() => setShareOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col p-6">
        <div className="flex-1 space-y-4 overflow-y-auto py-2">
          {!hasAnyMessages ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="font-display text-[17px] font-medium text-mv-ink">
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
            <>
              {initialMessages.map((m) => (
                <MessageBubble key={m.id} role={m.role} text={m.content} attachments={m.attachments} />
              ))}
              {messages.map((m) => {
                const text = m.parts
                  .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
                  .map((p) => p.text)
                  .join("");
                return <MessageBubble key={m.id} role={m.role === "user" ? "user" : "assistant"} text={text} />;
              })}
            </>
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-[12.5px] text-mv-ink-faint">
              <Bot size={14} /> L&apos;assistant réfléchit…
            </div>
          )}
        </div>

        <ChatInput
          restaurantId={restaurantId}
          conversationId={conversationId}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        />
        {error && (
          <p className="mt-2 text-[12px] text-mv-ink-faint">
            Une erreur est survenue — réessayez dans un instant.
          </p>
        )}
      </div>

      <CanvasPanel artifact={initialArtifact} />

      <ReferralModal open={shareOpen} onClose={() => setShareOpen(false)} restaurantId={restaurantId} />
    </div>
  );
}
