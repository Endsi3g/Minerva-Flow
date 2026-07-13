"use client";

import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/minerva/FormField";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { computeAlerts } from "@/lib/engine/alerts";
import { kpis, programs } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import { ArrowUp, Bot, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Pourquoi le revenu a baissé mercredi ?",
  "Quel programme a la meilleure marge ?",
  "Quelles alertes traiter en priorité ?",
  "Résume ma semaine en 3 points.",
];

const severityTone = { haute: "red", moyenne: "amber", basse: "neutral" } as const;

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const alerts = computeAlerts().slice(0, 4);
  const activePrograms = programs.filter((p) => p.status === "actif").slice(0, 3);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <div className="flex h-full min-h-0 gap-6">
      {/* Chat — left */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto py-2">
          {messages.length === 0 ? (
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
                    onClick={() => sendMessage({ text: s })}
                    className="rounded-full border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] font-medium text-mv-ink-soft transition-colors hover:bg-mv-cream-soft"
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

        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question…"
            className="flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Envoyer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </button>
        </form>
        {error && (
          <p className="mt-2 text-[12px] text-mv-ink-faint">
            Une erreur est survenue — réessayez dans un instant.
          </p>
        )}
      </div>

      {/* Context canvas — right */}
      <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-mv-border-soft pl-6 lg:flex">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
            Contexte
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-mv-cream-soft p-2.5">
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">Revenu</p>
              <p className="font-display text-[15px] font-medium text-mv-ink">
                {formatCurrency(kpis.totalRevenue)}
              </p>
            </div>
            <div className="rounded-lg bg-mv-cream-soft p-2.5">
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">Marge</p>
              <p className="font-display text-[15px] font-medium text-mv-ink">
                {formatCurrency(kpis.estimatedMargin)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
            Alertes actives
          </p>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-[12px] text-mv-ink-faint">Aucune alerte.</p>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-mv-border-soft p-2.5">
                  <Badge tone={severityTone[a.severity]} dot className="mb-1">
                    {a.title}
                  </Badge>
                  <p className="text-[11.5px] leading-snug text-mv-ink-soft">{a.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
            Programmes actifs
          </p>
          <div className="space-y-1.5">
            {activePrograms.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[12.5px]">
                <span className="truncate text-mv-ink-soft">{p.name}</span>
                <span className="shrink-0 font-semibold text-mv-ink">
                  {formatCurrency(p.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
