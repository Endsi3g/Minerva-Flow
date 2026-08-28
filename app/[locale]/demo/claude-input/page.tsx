"use client";

import { useState } from "react";
import Link from "next/link";
import { ClaudeChatInput } from "@/components/ui/claude-style-ai-input";
import { LogoMark } from "@/components/shell/Logo";
import {
  ArrowRight,
  Bot,
  User,
  RotateCcw,
  Copy,
  Check,
  Info,
  X,
  ExternalLink,
  Ghost,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ClaudeInputDemoPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showQuotaBanner, setShowQuotaBanner] = useState(true);

  async function handleSend(msg: string) {
    if (!msg.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: msg };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);
    setInputVal("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur de communication avec le serveur IA.");
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            const lastMsg = copy[copy.length - 1];
            if (lastMsg) {
              copy[copy.length - 1] = {
                role: "assistant",
                content: lastMsg.content + chunk,
              };
            }
            return copy;
          });
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Une analyse d'exploitation a été initiée. Pour visualiser les graphiques interactifs et les artefacts Recharts complets, vous pouvez basculer directement dans le copilote principal.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  function copyMessage(text: string, index: number) {
    void navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function resetChat() {
    setMessages([]);
    setInputVal("");
  }

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] text-[#1F1E1D] font-sans flex flex-col justify-between selection:bg-[#D97757]/20 selection:text-[#D97757]">
      
      {/* ── 1. Top Navigation Bar ── */}
      <header className="w-full border-b border-[#E8E5DF] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/overview"
            className="flex items-center gap-2.5 group"
          >
            <div className="flex items-center justify-center p-1 rounded-xl bg-white border border-[#E2E0D8] shadow-2xs group-hover:scale-105 transition-transform">
              <LogoMark size={24} />
            </div>
            <span className="font-sans font-bold text-sm text-[#0A3F2F] group-hover:text-[#0E7C5A] transition-colors">
              Minerva Flow
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/overview"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E7C5A] hover:bg-[#0A6348] text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Tableau de bord</span>
              <ArrowRight size={13} />
            </Link>

            <button
              type="button"
              className="h-8 w-8 rounded-full bg-white border border-[#E2E0D8] flex items-center justify-center text-[#5A5851] hover:text-[#1F1E1D] shadow-2xs"
              title="Profil Copilote"
            >
              <Ghost size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. Central Area Matching Image 3 ── */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col justify-center">
        
        {/* Top Greeting with Terracotta Asterisk (Image 3) */}
        <div className="text-center space-y-4 mb-6">
          <div className="flex items-center justify-center gap-2.5">
            {/* Terracotta/Coral Burst Asterisk Icon */}
            <span className="text-2xl sm:text-3xl text-[#D97757] select-none leading-none">
              ✱
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#1F1E1D]">
              Bon après-midi, Kael
            </h1>
          </div>
        </div>

        {/* Weekly Quota Banner (Image 3) */}
        {showQuotaBanner && (
          <div className="mb-4 bg-white border border-[#E2E0D8] rounded-2xl p-2.5 px-3.5 flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs text-[#5A5851] min-w-0">
              <Info size={14} className="shrink-0 text-[#8A887F]" />
              <span className="truncate">
                Vous avez utilisé 75 % de votre limite hebdomadaire.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F5F3ED] hover:bg-[#EAE8E0] text-[#1F1E1D] border border-[#E2E0D8] transition-colors"
              >
                Obtenir plus d&apos;utilisation
              </button>
              <button
                type="button"
                onClick={() => setShowQuotaBanner(false)}
                className="text-[#8A887F] hover:text-[#1F1E1D] p-1 rounded transition-colors"
                title="Fermer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Chat History if active */}
        {messages.length > 0 && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DF]">
              <span className="text-xs font-bold text-[#5A5851] uppercase tracking-wider font-mono">
                Discussion en direct
              </span>
              <button
                type="button"
                onClick={resetChat}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A887F] hover:text-[#1F1E1D] transition-colors"
              >
                <RotateCcw size={12} />
                <span>Effacer</span>
              </button>
            </div>

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 p-4 rounded-2xl ${
                  m.role === "user"
                    ? "bg-[#FAF8F5] border border-[#E8E5DF] ml-auto max-w-xl text-[#1F1E1D]"
                    : "bg-white border border-[#E2E0D8] shadow-xs max-w-2xl text-[#1F1E1D]"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-xl shrink-0 flex items-center justify-center ${
                    m.role === "user"
                      ? "bg-[#0E7C5A] text-white"
                      : "bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/30"
                  }`}
                >
                  {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F1E1D]">
                      {m.role === "user" ? "Vous" : "Sonnet 5 Copilote"}
                    </span>
                    {m.role === "assistant" && m.content && (
                      <button
                        type="button"
                        onClick={() => copyMessage(m.content, idx)}
                        className="text-[#8A887F] hover:text-[#1F1E1D] p-1 rounded transition-colors"
                        title="Copier la réponse"
                      >
                        {copiedIndex === idx ? (
                          <Check size={13} className="text-[#0E7C5A]" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-[#1F1E1D] leading-relaxed whitespace-pre-wrap">
                    {m.content || (
                      <span className="italic text-[#8A887F] animate-pulse">
                        Analyse en cours...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Claude Input Component (Image 3 & Image 2) */}
        <ClaudeChatInput
          value={inputVal}
          onChange={setInputVal}
          onSendMessage={handleSend}
          placeholder="Comment puis-je vous aider ?"
        />

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <button
            type="button"
            onClick={() => handleSend("Analyse mes marges brutes et mes 3 postes de food-cost prioritaires.")}
            className="px-3 py-1.5 rounded-full bg-white border border-[#E2E0D8] text-xs font-medium text-[#5A5851] hover:text-[#1F1E1D] hover:border-[#D97757]/40 transition-colors shadow-2xs"
          >
            📊 Audit Food-Cost &amp; Marges
          </button>
          <button
            type="button"
            onClick={() => handleSend("Classe ma carte selon la matrice Menu Engineering (Stars, Plowhorses, Puzzles).")}
            className="px-3 py-1.5 rounded-full bg-white border border-[#E2E0D8] text-xs font-medium text-[#5A5851] hover:text-[#1F1E1D] hover:border-[#D97757]/40 transition-colors shadow-2xs"
          >
            🍽️ Matrice Menu Engineering
          </button>
          <button
            type="button"
            onClick={() => handleSend("Simule le seuil de rentabilité du service du soir et le staffing idéal.")}
            className="px-3 py-1.5 rounded-full bg-white border border-[#E2E0D8] text-xs font-medium text-[#5A5851] hover:text-[#1F1E1D] hover:border-[#D97757]/40 transition-colors shadow-2xs"
          >
            ⚡ Seuil de Rentabilité &amp; Staffing
          </button>
        </div>

      </main>

      {/* ── 3. Bottom Minimal Footer ── */}
      <footer className="w-full py-4 text-center border-t border-[#E8E5DF] text-xs text-[#8A887F]">
        <Link
          href="/assistant"
          className="inline-flex items-center gap-1 text-[#0E7C5A] hover:underline font-semibold"
        >
          <span>Basculer vers le mode assistant avec graphiques interactifs</span>
          <ExternalLink size={12} />
        </Link>
      </footer>

    </div>
  );
}
