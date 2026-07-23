"use client";

import { ChatAttachments, type PreparedAttachment } from "@/components/chat/ChatAttachments";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { ArrowUp, Mic, MicOff, Loader2, FolderOpen, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

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
    <form onSubmit={handleSubmit} className="mt-2">
      <div className="relative rounded-3xl border border-mv-border bg-mv-surface p-3.5 md:p-4 shadow-mv-lg transition-all focus-within:border-mv-green-dark">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Entrer une invite ici..."
          rows={1}
          className="w-full resize-none bg-transparent px-2 py-1 text-[14.5px] leading-relaxed text-mv-ink placeholder-mv-ink-faint focus:outline-none min-h-[38px] max-h-[180px]"
        />

        {speech.isListening && speech.interimTranscript && (
          <span className="pointer-events-none absolute left-5 top-4 flex items-center truncate text-[13.5px] text-mv-ink-faint">
            {input ? `${input} ` : ""}
            {speech.interimTranscript}
          </span>
        )}

        <div className="mt-2">
          <ChatAttachments
            restaurantId={restaurantId}
            conversationId={conversationId}
            attachments={attachments}
            onChange={setAttachments}
          >
            {(openUpload, uploadLoading) => (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-mv-border-soft/80 pt-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openUpload}
                    disabled={uploadLoading}
                    title="Ajouter des fichiers"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-mv-border bg-mv-cream-soft text-mv-ink transition-colors hover:bg-mv-border/40 disabled:opacity-50"
                  >
                    {uploadLoading ? (
                      <Loader2 size={15} className="animate-spin text-mv-green-dark" />
                    ) : (
                      <Plus size={16} />
                    )}
                  </button>

                  <Link
                    href="/library"
                    className="flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-cream-soft px-3 py-1 text-[11.5px] font-semibold text-mv-ink transition-colors hover:bg-mv-border/40"
                  >
                    <FolderOpen size={13} className="text-mv-green-dark" />
                    <span>Bibliothèque</span>
                  </Link>
                </div>

                <div className="flex items-center gap-2">
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
                      {speech.isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={(!input.trim() && attachments.length === 0) || isLoading}
                    aria-label="Envoyer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-mv-green text-mv-cream-soft hover:bg-mv-green-dark transition-all shadow-mv-sm disabled:pointer-events-none disabled:bg-mv-ink/[0.06] disabled:text-mv-ink-faint"
                  >
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}
          </ChatAttachments>
        </div>
      </div>
    </form>
  );
}
