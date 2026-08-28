"use client";

import { useState } from "react";
import Link from "next/link";
import { ClaudeChatInput } from "@/components/ui/claude-style-ai-input";
import {
  TrendingUp,
  UtensilsCrossed,
  Calculator,
  ArrowRight,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface PresetPrompt {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  desc: string;
  icon: typeof TrendingUp;
  prompt: string;
}

const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: "food-cost",
    tag: "Rentabilité",
    tagColor: "bg-emerald-50 text-[#0E7C5A] border-emerald-200",
    title: "Audit Food-Cost & Marges",
    desc: "Détecte les dérives de coûts matières et les 3 leviers de marge brute immédiats.",
    icon: TrendingUp,
    prompt:
      "Analyse mes marges brutes de la semaine et identifie les 3 postes de dépenses ou dérives food-cost prioritaires à corriger.",
  },
  {
    id: "menu-engineering",
    tag: "Ingénierie Menu",
    tagColor: "bg-amber-50 text-amber-800 border-amber-200",
    title: "Matrice Menu Engineering",
    desc: "Classe les plats selon la matrice Stars / Plowhorses / Puzzles et ajuste les prix.",
    icon: UtensilsCrossed,
    prompt:
      "Classe les plats de ma carte selon la matrice d'ingénierie (Stars, Plowhorses, Puzzles, Dogs) et propose des ajustements de prix stratégiques.",
  },
  {
    id: "break-even-staffing",
    tag: "Opérations",
    tagColor: "bg-blue-50 text-blue-800 border-blue-200",
    title: "Seuil de Rentabilité & Staffing",
    desc: "Simule le point mort des services du soir et calibre le nombre d'équipiers idéal.",
    icon: Calculator,
    prompt:
      "Simule le seuil de rentabilité pour mes services du soir et recommande le dimensionnement idéal de l'équipe en salle et en cuisine.",
  },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ClaudeInputDemoPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  function handleSelectPreset(promptText: string) {
    setInputVal(promptText);
    void handleSend(promptText);
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
    <div className="min-h-screen w-full bg-[#FAF8F5] text-[#1F1E1D] flex flex-col font-sans selection:bg-[#0E7C5A]/15 selection:text-[#0E7C5A]">
      {/* ── 1. Top Fixed Navigation Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E8E5DF] bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Breadcrumb */}
          <div className="flex items-center gap-3">
            <Link
              href="/overview"
              className="flex items-center gap-2.5 group transition-transform active:scale-95"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0E7C5A] text-white font-serif font-bold text-sm shadow-xs border border-[#0E7C5A]/30">
                M
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-serif font-bold text-[15px] text-[#0A3F2F] group-hover:text-[#0E7C5A] transition-colors">
                  Minerva Flow
                </span>
                <span className="text-[10px] text-[#8A887F] font-medium leading-none">
                  Intelligence d&apos;exploitation
                </span>
              </div>
            </Link>

            <span className="hidden sm:inline-block text-[#D1CECA] text-xs font-mono">/</span>
            <span className="hidden sm:inline-block text-xs font-semibold text-[#5A5851]">
              Démo Copilote IA
            </span>
          </div>

          {/* Model Status & Return Button */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0E7C5A]/10 border border-[#0E7C5A]/20 text-[#0E7C5A] text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0E7C5A] animate-pulse" />
              <span>Gemini 3.7 Flash · En ligne</span>
            </div>

            <Link
              href="/overview"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0E7C5A] hover:bg-[#0A6348] text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Retourner au tableau de bord</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Main Content Area (100% Light Mode) ── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-between">
        
        {/* Title & Introduction */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8E5DF] shadow-xs text-[11px] font-bold text-[#0E7C5A] uppercase tracking-wider mb-1">
            <Sparkles size={12} className="text-[#0E7C5A]" />
            <span>Saisie Avancée Style Claude · Restauration &amp; Café</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0A3F2F]">
            Quelles métriques d&apos;exploitation auditer ?
          </h1>
          <p className="text-sm sm:text-base text-[#6A6860] max-w-xl mx-auto leading-relaxed">
            Glissez-déposez des fichiers de caisse, posez vos questions en langage naturel ou lancez un des 3 diagnostics stratégiques ci-dessous.
          </p>
        </div>

        {/* ── 3. The 3 Preset Strategy Prompt Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-8">
          {PRESET_PROMPTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.prompt)}
                className="group relative flex flex-col justify-between text-left p-4 rounded-2xl bg-white border border-[#E8E5DF] hover:border-[#0E7C5A]/50 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${item.tagColor}`}
                    >
                      {item.tag}
                    </span>
                    <div className="h-7 w-7 rounded-lg bg-[#FAF8F5] border border-[#E8E5DF] flex items-center justify-center text-[#0E7C5A] group-hover:bg-[#0E7C5A] group-hover:text-white transition-colors">
                      <Icon size={14} />
                    </div>
                  </div>
                  <h3 className="font-serif font-bold text-sm text-[#1F1E1D] group-hover:text-[#0E7C5A] transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[12px] text-[#6A6860] line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-[#F0EFEA] flex items-center justify-between text-[11px] font-bold text-[#0E7C5A]">
                  <span>Lancer l&apos;analyse</span>
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 4. Chat Messages History (if any) ── */}
        {messages.length > 0 && (
          <div className="space-y-4 mb-8">
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
                    ? "bg-[#FAF8F5] border border-[#E8E5DF] ml-auto max-w-2xl"
                    : "bg-white border border-[#E8E5DF] shadow-xs max-w-3xl"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-xl shrink-0 flex items-center justify-center ${
                    m.role === "user"
                      ? "bg-[#0E7C5A] text-white"
                      : "bg-[#0E7C5A]/10 text-[#0E7C5A] border border-[#0E7C5A]/20"
                  }`}
                >
                  {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1F1E1D]">
                      {m.role === "user" ? "Vous" : "Flow Copilot IA"}
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
                        Analyse d&apos;exploitation en cours...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 5. Claude-Style Chat Input (Light Mode) ── */}
        <div className="w-full">
          <ClaudeChatInput
            value={inputVal}
            onChange={setInputVal}
            onSendMessage={handleSend}
            placeholder="Posez une question sur vos ventes, food cost ou marges..."
          />
        </div>

        {/* ── 6. Bottom Helper Link ── */}
        <div className="mt-8 pt-6 border-t border-[#E8E5DF] text-center">
          <Link
            href="/assistant"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7C5A] hover:underline"
          >
            <span>Ouvrir l&apos;environnement complet de discussion avec artefacts interactifs</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </main>
    </div>
  );
}
