"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/minerva/FormField";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, KeyRound, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Pourquoi le revenu a-t-il baissé mercredi ?",
  "Quel programme a la meilleure marge en ce moment ?",
  "Quelles alertes dois-je traiter en priorité ?",
  "Résume ma semaine en 3 points.",
];

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const notConfigured = Boolean(error);
  const isLoading = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || notConfigured) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        eyebrow="Minerva AI"
        title="Assistant"
        description="Posez une question sur vos revenus, vos journées de service ou vos campagnes — les réponses s'appuient sur vos données réelles."
      />

      {notConfigured && (
        <Card className="mb-4 flex items-center gap-3 border-mv-amber bg-mv-amber-bg">
          <KeyRound size={18} className="shrink-0 text-mv-amber" />
          <p className="text-[13px] leading-relaxed text-mv-ink">
            L&apos;assistant n&apos;est pas encore configuré. Ajoutez{" "}
            <code className="rounded bg-mv-ink/10 px-1 py-0.5 font-mono text-[12px]">
              AI_GATEWAY_API_KEY
            </code>{" "}
            dans <code className="rounded bg-mv-ink/10 px-1 py-0.5 font-mono text-[12px]">.env.local</code>{" "}
            pour l&apos;activer — aucune autre modification n&apos;est nécessaire.
          </p>
        </Card>
      )}

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="font-display text-[16px] font-medium text-mv-ink">
                  Que voulez-vous savoir ?
                </p>
                <p className="mt-1 text-[13px] text-mv-ink-soft">
                  Quelques idées pour commencer :
                </p>
              </div>
              <div className="flex max-w-md flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => !notConfigured && sendMessage({ text: s })}
                    disabled={notConfigured}
                    className="rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-cream-soft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className={cn(
                    "mv-scale-in max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed",
                    m.role === "user"
                      ? "bg-mv-green text-mv-cream-soft"
                      : "bg-mv-cream-soft text-mv-ink"
                  )}
                >
                  {m.parts.map((part, i) =>
                    part.type === "text" ? <span key={i}>{part.text}</span> : null
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-[12.5px] text-mv-ink-faint">
              <Bot size={14} /> L&apos;assistant réfléchit…
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-3 flex items-center gap-2 border-t border-mv-border-soft pt-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              notConfigured ? "Assistant non configuré…" : "Posez votre question…"
            }
            disabled={notConfigured}
            className="flex-1"
          />
          <Button type="submit" disabled={notConfigured || !input.trim() || isLoading} size="icon">
            <Send size={15} />
          </Button>
        </form>
      </Card>
    </div>
  );
}
