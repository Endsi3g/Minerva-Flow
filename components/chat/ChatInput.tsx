"use client";

import { ChatAttachments, type PreparedAttachment } from "@/components/chat/ChatAttachments";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { Input } from "@/components/minerva/FormField";
import { cn } from "@/lib/utils";
import { ArrowUp, Mic, MicOff } from "lucide-react";
import { useState } from "react";

export function ChatInput({
  restaurantId,
  conversationId,
  isLoading,
  onSubmit,
}: {
  restaurantId: string;
  conversationId: string;
  isLoading: boolean;
  onSubmit: (text: string, attachments: PreparedAttachment[]) => void;
}) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PreparedAttachment[]>([]);
  const speech = useSpeechRecognition({ lang: "fr-CA" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    onSubmit(input, attachments);
    setInput("");
    setAttachments([]);
  }

  function toggleMic() {
    if (speech.isListening) {
      speech.stop();
      return;
    }
    speech.start((finalChunk) => {
      setInput((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <ChatAttachments
        restaurantId={restaurantId}
        conversationId={conversationId}
        attachments={attachments}
        onChange={setAttachments}
      />
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question…"
            className="flex-1"
          />
          {speech.isListening && speech.interimTranscript && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center truncate text-[13px] text-mv-ink-faint">
              {input ? `${input} ` : ""}
              {speech.interimTranscript}
            </span>
          )}
        </div>
        {speech.isSupported && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={speech.isListening ? "Arrêter la dictée" : "Dicter"}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
              speech.isListening
                ? "bg-mv-red-bg text-mv-red"
                : "text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-ink"
            )}
          >
            {speech.isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <button
          type="submit"
          disabled={(!input.trim() && attachments.length === 0) || isLoading}
          aria-label="Envoyer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </form>
  );
}
