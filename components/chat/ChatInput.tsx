"use client";

import { ChatAttachments, type PreparedAttachment } from "@/components/chat/ChatAttachments";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { ArrowUp, Mic, MicOff, Paperclip, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(200, textarea.scrollHeight)}px`;
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    onSubmit(input, attachments);
    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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
      <div className="relative rounded-2xl border border-mv-border bg-mv-cream-soft p-3.5 shadow-mv-sm focus-within:border-mv-green-dark transition-all">
        {/* Multiline textarea style Claude */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Posez votre question à l'assistant..."
          rows={1}
          className="w-full resize-none bg-transparent py-1 px-1 text-[13.5px] leading-relaxed text-mv-ink placeholder-mv-ink-faint focus:outline-none min-h-[24px] max-h-[200px]"
        />

        {speech.isListening && speech.interimTranscript && (
          <span className="pointer-events-none absolute left-4.5 top-4.5 flex items-center truncate text-[13px] text-mv-ink-faint">
            {input ? `${input} ` : ""}
            {speech.interimTranscript}
          </span>
        )}

        {/* Attachments Section & Button Row inside the box */}
        <div className="mt-2">
          <ChatAttachments
            restaurantId={restaurantId}
            conversationId={conversationId}
            attachments={attachments}
            onChange={setAttachments}
          >
            {(openUpload, uploadLoading) => (
              <div className="flex items-center justify-between border-t border-mv-border/40 mt-3 pt-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openUpload}
                    disabled={uploadLoading}
                    aria-label="Joindre un fichier"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:opacity-50"
                  >
                    {uploadLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Paperclip size={15} />
                    )}
                  </button>

                  {speech.isSupported && (
                    <button
                      type="button"
                      onClick={toggleMic}
                      aria-label={speech.isListening ? "Arrêter la dictée" : "Dicter"}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                        speech.isListening
                          ? "bg-mv-red-bg text-mv-red"
                          : "text-mv-ink-soft hover:bg-mv-ink/5 hover:text-mv-ink"
                      )}
                    >
                      {speech.isListening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={(!input.trim() && attachments.length === 0) || isLoading}
                  aria-label="Envoyer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-mv-green text-mv-cream-soft hover:bg-mv-green-dark transition-colors disabled:pointer-events-none disabled:bg-mv-ink/[0.06] disabled:text-mv-ink-faint"
                >
                  <ArrowUp size={15} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </ChatAttachments>
        </div>
      </div>
    </form>
  );
}
