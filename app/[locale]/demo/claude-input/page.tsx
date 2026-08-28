"use client";

import { useState } from "react";
import Link from "next/link";
import { ClaudeChatInput } from "@/components/ui/claude-style-ai-input";
import { MeshDriftBackground } from "@/components/ui/MeshDriftBackground";
import { LogoMark } from "@/components/shell/Logo";
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
  Plus,
  MessageSquare,
  Search,
  Zap,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const RECENT_CHATS = [
  { id: "1", title: "Audit marge brute semaine 34", time: "Il y a 2h" },
  { id: "2", title: "Optimisation carte des vins", time: "Hier" },
  { id: "3", title: "Seuil de rentabilité 5 à 7", time: "Il y a 3j" },
];

export default function ClaudeInputDemoPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredChats = RECENT_CHATS.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen w-full flex bg-[#FAF8F5] text-[#1F1E1D] font-sans overflow-hidden">
      {/* ── 0. Soft Emerald WebGL Mesh Drift Shader Background ── */}
      <MeshDriftBackground variant="soft-emerald" />

      {/* ── 1. Left AI Sidebar (Light Mode) ── */}
      <aside
        className={cn(
          "relative z-30 h-screen flex-col justify-between border-r border-[#E8E5DF] bg-white/95 backdrop-blur-md transition-all duration-300 hidden md:flex",
          sidebarOpen ? "w-72" : "w-16"
        )}
      >
        {/* Sidebar Top: Logo & Collapse Button */}
        <div>
          <div className="flex items-center justify-between p-4 border-b border-[#F0EFEA]">
            <Link
              href="/overview"
              className={cn("flex items-center gap-2.5 group overflow-hidden", !sidebarOpen && "justify-center w-full")}
            >
              <div className="flex items-center justify-center p-1 rounded-xl bg-[#0E7C5A]/10 border border-[#0E7C5A]/25 shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <LogoMark size={24} />
              </div>
              {sidebarOpen && (
                <div className="flex flex-col leading-tight truncate">
                  <span className="font-serif font-bold text-sm text-[#0A3F2F] group-hover:text-[#0E7C5A] transition-colors">
                    Minerva Flow
                  </span>
                  <span className="text-[10px] text-[#8A887F]">Copilote IA</span>
                </div>
              )}
            </Link>

            {sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="h-7 w-7 rounded-lg text-[#8A887F] hover:text-[#1F1E1D] hover:bg-black/[0.05] flex items-center justify-center transition-colors"
                title="Replier la barre latérale"
              >
                <PanelLeftClose size={15} />
              </button>
            )}
          </div>

          {!sidebarOpen && (
            <div className="p-2 flex justify-center border-b border-[#F0EFEA]">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8 rounded-lg text-[#8A887F] hover:text-[#1F1E1D] hover:bg-black/[0.05] flex items-center justify-center transition-colors"
                title="Déplier la barre latérale"
              >
                <PanelLeft size={16} />
              </button>
            </div>
          )}

          {/* New Chat Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={resetChat}
              className={cn(
                "w-full h-10 rounded-xl bg-[#0E7C5A] hover:bg-[#0A6348] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                !sidebarOpen && "px-0"
              )}
            >
              <Plus size={16} />
              {sidebarOpen && <span>Nouvel échange IA</span>}
            </button>
          </div>

          {/* Search Box */}
          {sidebarOpen && (
            <div className="px-3 pb-2">
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-3 text-[#8A887F]" />
                <input
                  type="text"
                  placeholder="Rechercher une conversation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#FAF8F5] border border-[#E8E5DF] text-xs text-[#1F1E1D] placeholder:text-[#8A887F] focus:border-[#0E7C5A] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Recent Conversations */}
          {sidebarOpen && (
            <div className="px-3 py-2 space-y-1">
              <span className="px-2 text-[10px] font-mono font-semibold text-[#8A887F] uppercase tracking-wider">
                Récents
              </span>
              <div className="space-y-0.5 mt-1">
                {filteredChats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectPreset(`Reprendre l'analyse : ${c.title}`)}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.04] transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare size={13} className="text-[#8A887F] shrink-0 group-hover:text-[#0E7C5A]" />
                      <span className="truncate">{c.title}</span>
                    </div>
                    <ChevronRight size={12} className="text-[#8A887F] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Bottom: Pro Quota & Back Link */}
        <div className="p-3 border-t border-[#F0EFEA] space-y-2">
          {sidebarOpen ? (
            <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A3F2F]">
                  <Zap size={13} className="text-[#0E7C5A]" />
                  <span>Quota Pro IA</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#0E7C5A]/15 text-[#0E7C5A] border border-[#0E7C5A]/30">
                  Actif
                </span>
              </div>
              <p className="text-[11px] text-[#6A6860] leading-tight">
                Requêtes &amp; audits illimités inclus avec votre formule.
              </p>
            </div>
          ) : (
            <div className="flex justify-center" title="Quota Pro Illimité">
              <Zap size={16} className="text-[#0E7C5A]" />
            </div>
          )}

          <Link
            href="/overview"
            className={cn(
              "w-full h-9 rounded-xl border border-[#E8E5DF] hover:border-[#0E7C5A]/40 bg-white text-xs font-semibold text-[#5A5851] hover:text-[#1F1E1D] flex items-center justify-center gap-2 transition-colors shadow-xs",
              !sidebarOpen && "px-0"
            )}
          >
            <ArrowRight size={13} className="rotate-180" />
            {sidebarOpen && <span>Tableau de bord</span>}
          </Link>
        </div>
      </aside>

      {/* ── 2. Main Center Area ── */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
        
        {/* Top Header */}
        <header className="sticky top-0 z-20 w-full border-b border-[#E8E5DF] bg-white/95 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/overview"
                className="flex items-center gap-2.5 group"
              >
                <div className="flex items-center justify-center p-1 rounded-xl bg-[#0E7C5A]/10 border border-[#0E7C5A]/25 shadow-xs">
                  <LogoMark size={22} />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-serif font-bold text-sm text-[#0A3F2F]">Minerva Flow</span>
                  <span className="text-[9.5px] text-[#8A887F] font-medium hidden sm:inline">Copilote IA</span>
                </div>
              </Link>
              <span className="hidden sm:inline text-[#D1CECA] text-xs">/</span>
              <span className="text-xs font-semibold text-[#5A5851] hidden sm:inline">Démo Claude-Style</span>
            </div>

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

        {/* Content Container */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col justify-between">
          
          {/* Headline */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8E5DF] shadow-xs text-[11px] font-bold text-[#0E7C5A] uppercase tracking-wider mb-1">
              <Sparkles size={12} className="text-[#0E7C5A]" />
              <span>Saisie Avancée Style Claude · Restauration &amp; Café</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0A3F2F]">
              Quelles métriques d&apos;exploitation auditer ?
            </h1>
            <p className="text-xs sm:text-sm text-[#6A6860] max-w-lg mx-auto leading-relaxed">
              Glissez-déposez des fichiers de caisse ou posez une question sur vos ventes, food cost et marges.
            </p>
          </div>

          {/* Preset Prompts 3-Grid */}
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

          {/* Messages Stream Area */}
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
                      ? "bg-[#FAF8F5] border border-[#E8E5DF] ml-auto max-w-2xl text-[#1F1E1D]"
                      : "bg-white border border-[#E8E5DF] shadow-xs max-w-3xl text-[#1F1E1D]"
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

          {/* Claude-Style Chat Input Component (Light Mode) */}
          <div className="w-full">
            <ClaudeChatInput
              value={inputVal}
              onChange={setInputVal}
              onSendMessage={handleSend}
              placeholder="Posez une question sur vos ventes, food cost ou marges..."
            />
          </div>

          {/* Bottom Link to Assistant */}
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
    </div>
  );
}
