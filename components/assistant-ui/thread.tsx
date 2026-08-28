"use client";

import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
  useAui,
} from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { AttachmentPreview, UserMessageAttachment } from "@/components/assistant-ui/attachment";
import { ReasoningAccordion } from "@/components/assistant-ui/reasoning";
import { ChatCommandPopover, type CommandItem } from "@/components/chat/ChatCommandPopover";
import {
  Bot,
  ArrowUp,
  Square,
  Paperclip,
  Copy,
  Check,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PackageCheck,
  UtensilsCrossed,
  BarChart3,
  ArrowDown,
  Sparkles,
  ExternalLink,
  Clock,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ACTION_SUGGESTIONS = [
  {
    badge: "Rentabilité",
    badgeTone: "bg-emerald-50 text-emerald-800 border-emerald-200",
    impact: "+3 400 $ marge est.",
    duration: "2 min",
    title: "Analyse des revenus & marges",
    desc: "Identifier les tendances de vente et détecter les anomalies de food cost hebdomadaires.",
    icon: TrendingUp,
    prompt: "Fais une analyse détaillée des revenus et de la marge brute. Où se situent les principales opportunités d'optimisation ?",
  },
  {
    badge: "Opérations",
    badgeTone: "bg-blue-50 text-blue-800 border-blue-200",
    impact: "-12% gaspillage",
    duration: "1 min",
    title: "Plan d'action opérationnel",
    desc: "Optimiser les réapprovisionnements, la rotation des stocks et sécuriser le service du week-end.",
    icon: PackageCheck,
    prompt: "Propose un plan d'action d'optimisation des achats et de gestion des stocks pour la semaine à venir.",
  },
  {
    badge: "Menu Engineering",
    badgeTone: "bg-amber-50 text-amber-800 border-amber-200",
    impact: "+1.80 $ ticket moy.",
    duration: "2 min",
    title: "Ingénierie du menu & plats étoiles",
    desc: "Catégoriser les plats Stars, Plowhorses, Puzzles et Dogs pour ajuster la carte.",
    icon: UtensilsCrossed,
    prompt: "Analyse mes plats phares et mes marges pour catégoriser la carte selon la matrice de rentabilité du menu engineering.",
  },
  {
    badge: "Rapports & Clôture",
    badgeTone: "bg-purple-50 text-purple-800 border-purple-200",
    impact: "100% synchronisé",
    duration: "Instant",
    title: "Évolution du panier moyen & POS",
    desc: "Comparer les volumes de couverts et tracer la progression du ticket moyen.",
    icon: BarChart3,
    prompt: "Génère une synthèse de l'évolution du panier moyen et des volumes de couverts par rapport aux programmes actifs.",
  },
];

export function Thread({
  userName = "Directeur d'exploitation",
}: {
  userName?: string;
}) {
  return (
    <ThreadPrimitive.Root className="flex h-full w-full flex-col bg-[#FAF8F5] overflow-hidden relative font-sans text-[#1F1E1D]">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Editorial Welcome Screen */}
          <ThreadPrimitive.Empty>
            <div className="pt-6 pb-4 space-y-7 max-w-2xl mx-auto">
              <div className="space-y-1.5 text-center sm:text-left">
                <h1 className="font-sans font-bold text-3xl sm:text-4xl tracking-tight text-[#0A3F2F]">
                  Bonjour, <span className="font-serif italic font-normal text-[#0E7C5A]">{userName}</span>
                </h1>
                <p className="font-sans text-sm sm:text-base text-[#6A6860]">
                  Quelles métriques de performance souhaitez-vous auditer aujourd&apos;hui ?
                </p>
              </div>

              {/* 2x2 SaaS Action Suggestion Cards with Impact Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {ACTION_SUGGESTIONS.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <ThreadPrimitive.Suggestion
                      key={idx}
                      prompt={card.prompt}
                      method="replace"
                      autoSend
                      asChild
                    >
                      <button
                        type="button"
                        aria-label={`Prompt suggéré: ${card.title}`}
                        className="group flex flex-col justify-between p-4 rounded-2xl border border-[#E8E5DF] bg-white text-left transition-all duration-200 hover:border-[#0E7C5A]/50 hover:shadow-sm hover:-translate-y-0.5 min-h-[145px]"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1", card.badgeTone)}>
                              <Icon size={11} />
                              <span>{card.badge}</span>
                            </span>
                            <span className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {card.impact}
                            </span>
                          </div>
                          <h3 className="font-sans text-[13.5px] font-bold text-[#1F1E1D] group-hover:text-[#0E7C5A] transition-colors">
                            {card.title}
                          </h3>
                          <p className="text-[11.5px] text-[#6A6860] mt-1 leading-relaxed line-clamp-2">
                            {card.desc}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#8A887F] group-hover:text-[#0E7C5A] font-semibold pt-2.5 border-t border-[#F0EFEA] mt-3">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {card.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>Lancer l&apos;audit</span>
                            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </button>
                    </ThreadPrimitive.Suggestion>
                  );
                })}
              </div>
            </div>
          </ThreadPrimitive.Empty>

          {/* Messages Stream */}
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      {/* Scroll to bottom button */}
      <ThreadPrimitive.ScrollToBottom asChild>
        <button
          type="button"
          aria-label="Faire défiler vers le bas"
          className="absolute bottom-24 right-6 flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E0D8] bg-white text-[#1F1E1D] shadow-sm hover:bg-gray-50 transition-all"
        >
          <ArrowDown size={14} />
        </button>
      </ThreadPrimitive.ScrollToBottom>

      {/* Floating Modernized Composer */}
      <div className="p-3 sm:p-5 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5] to-transparent">
        <div className="max-w-3xl mx-auto">
          <MultifunctionComposer />
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end gap-3 group">
      <div className="flex max-w-[85%] sm:max-w-[75%] flex-col items-end gap-1.5">
        {/* Attachments */}
        <MessagePrimitive.Attachments
          components={{
            Attachment: UserMessageAttachment,
          }}
        />

        <div className="rounded-2xl rounded-tr-sm bg-[#0E7C5A] px-4 py-2.5 text-[13.5px] text-white shadow-xs leading-relaxed font-sans font-medium">
          <MessagePrimitive.Content />
        </div>

        {/* Branch picker */}
        <BranchPicker />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex gap-3.5 group">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E2E0D8] text-[#0E7C5A] shadow-xs mt-0.5">
        <Bot size={15} />
      </div>

      <div className="flex flex-1 flex-col gap-2 min-w-0">
        {/* Reasoning / Thinking accordion */}
        <ReasoningAccordion />

        {/* Markdown Content */}
        <div className="rounded-2xl rounded-tl-sm border border-[#E8E5DF] bg-white px-4.5 py-3.5 text-[#1F1E1D] shadow-xs space-y-3">
          <MessagePrimitive.Content
            components={{
              Text: MarkdownText,
            }}
          />

          {/* Dynamic Action & Quick Link CTAs */}
          <GenerativeActionCard />
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-1 text-[#8A887F] opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionBarPrimitive.Copy asChild>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white hover:text-[#1F1E1D] transition-colors"
              title="Copier la réponse"
            >
              <MessagePrimitive.If copied>
                <Check size={13} className="text-[#0E7C5A]" />
              </MessagePrimitive.If>
              <MessagePrimitive.If copied={false}>
                <Copy size={13} />
              </MessagePrimitive.If>
            </button>
          </ActionBarPrimitive.Copy>

          <ActionBarPrimitive.Reload asChild>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-white hover:text-[#1F1E1D] transition-colors"
              title="Régénérer"
            >
              <RotateCcw size={13} />
            </button>
          </ActionBarPrimitive.Reload>

          <BranchPicker />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

function GenerativeActionCard() {
  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({});

  const toggleItem = (idx: number) => {
    setCompletedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="pt-2 border-t border-[#F0EFEA]">
      <div className="rounded-2xl bg-[#FAF8F5] border border-[#E8E5DF] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#0A3F2F]">
            <Sparkles size={12} className="text-[#0E7C5A]" />
            Recommandations d&apos;action immédiate
          </span>
          <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold">
            +3 400 $ marge est.
          </span>
        </div>

        <div className="space-y-1.5 text-[11.5px] text-[#5A5851]">
          {[
            "Réajuster la tarification des cocktails du programme '5 à 7' (+8% marge brute).",
            "Vérifier les réapprovisionnements critiques pour sécuriser le service de ce week-end.",
            "Régulariser les écritures de clôture de caisse en attente.",
          ].map((action, i) => (
            <label
              key={i}
              onClick={() => toggleItem(i)}
              className="flex items-start gap-2 cursor-pointer rounded-lg p-1 hover:bg-white transition-colors"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  completedItems[i]
                    ? "bg-[#0E7C5A] border-[#0E7C5A] text-white"
                    : "border-[#D1CECA] bg-white"
                )}
              >
                {completedItems[i] && <Check size={11} strokeWidth={3} />}
              </div>
              <span className={cn(completedItems[i] && "line-through opacity-60 text-[#8A887F]")}>
                {action}
              </span>
            </label>
          ))}
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-[#E8E5DF]">
          <Link
            href="/menu"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E7C5A] bg-white border border-[#E2E0D8] px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <span>Menu Engineering</span>
            <ExternalLink size={10} />
          </Link>
          <Link
            href="/inventaire"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5A5851] bg-white border border-[#E2E0D8] px-2.5 py-1 rounded-lg hover:bg-gray-50 hover:text-[#1F1E1D] transition-colors shadow-2xs"
          >
            <span>Gestion des Stocks</span>
            <ExternalLink size={10} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function BranchPicker() {
  return (
    <BranchPickerPrimitive.Root className="flex items-center gap-1 text-xs text-[#8A887F]">
      <BranchPickerPrimitive.Previous asChild>
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded hover:bg-white"
        >
          <ChevronLeft size={12} />
        </button>
      </BranchPickerPrimitive.Previous>

      <span className="text-[11px] font-mono font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>

      <BranchPickerPrimitive.Next asChild>
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center rounded hover:bg-white"
        >
          <ChevronRight size={12} />
        </button>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
}

function MultifunctionComposer() {
  const [popoverTrigger, setPopoverTrigger] = useState<"/" | "@" | null>(null);
  const [popoverQuery, setPopoverQuery] = useState("");
  const aui = useAui();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const lastWord = val.split(/\s+/).pop() || "";

    if (lastWord.startsWith("/")) {
      setPopoverTrigger("/");
      setPopoverQuery(lastWord.slice(1));
    } else if (lastWord.startsWith("@")) {
      setPopoverTrigger("@");
      setPopoverQuery(lastWord.slice(1));
    } else {
      setPopoverTrigger(null);
      setPopoverQuery("");
    }
  };

  const handleSelectCommand = (item: CommandItem) => {
    const currentText = aui.composer.getState().text || "";
    const words = currentText.split(/\s+/);
    words.pop();
    const prefix = words.length > 0 ? words.join(" ") + " " : "";
    
    aui.composer.setText(prefix + item.promptSnippet);
    setPopoverTrigger(null);
    setPopoverQuery("");
  };

  return (
    <div className="relative select-none">
      {/* Autocomplete Popover */}
      {popoverTrigger && (
        <ChatCommandPopover
          triggerType={popoverTrigger}
          query={popoverQuery}
          onSelect={handleSelectCommand}
          onClose={() => setPopoverTrigger(null)}
        />
      )}

      <ComposerPrimitive.Root className="flex flex-col rounded-2xl border border-[#E2E0D8] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all focus-within:border-[#0E7C5A] focus-within:ring-2 focus-within:ring-[#0E7C5A]/15">
        {/* Attachments preview list */}
        <div className="flex flex-wrap gap-2 p-2.5 pb-0 empty:hidden">
          <ComposerPrimitive.Attachments
            components={{
              Attachment: AttachmentPreview,
            }}
          />
        </div>

        <div className="flex items-end gap-2 p-2.5 sm:p-3">
          {/* Attachment upload button */}
          <ComposerPrimitive.AddAttachment asChild>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#5A5851] hover:bg-gray-100 hover:text-[#1F1E1D] transition-colors"
              title="Ajouter un fichier"
            >
              <Paperclip size={16} />
            </button>
          </ComposerPrimitive.AddAttachment>

          {/* Text Input */}
          <ComposerPrimitive.Input
            rows={1}
            autoFocus
            onChange={handleInputChange}
            placeholder="Posez une question, tapez '/' pour les commandes ou '@' pour les données POS..."
            className="flex-1 max-h-36 resize-none bg-transparent py-1 text-[13px] sm:text-[13.5px] text-[#1F1E1D] placeholder:text-[#8A887F] focus:outline-none leading-relaxed"
          />

          {/* Send / Cancel Button */}
          <ComposerPrimitive.Send asChild>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0E7C5A] text-white shadow-xs hover:bg-[#0A6348] transition-all disabled:opacity-35"
            >
              <ArrowUp size={15} />
            </button>
          </ComposerPrimitive.Send>

          <ComposerPrimitive.Cancel asChild>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1F1E1D] text-white shadow-xs hover:bg-black transition-all"
            >
              <Square size={13} />
            </button>
          </ComposerPrimitive.Cancel>
        </div>
      </ComposerPrimitive.Root>

      {/* Sub-bar with clickable shortcut helpers */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-[10.5px] text-[#8A887F]">
        <button
          type="button"
          onClick={() => {
            aui.composer.setText("Génère un plan d'action opérationnel complet pour optimiser les achats et la gestion des stocks.");
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E8E5DF] hover:border-[#0E7C5A] hover:text-[#1F1E1D] transition-colors shadow-2xs"
        >
          <kbd className="bg-[#FAF8F5] px-1.5 py-0.5 rounded font-mono text-[#1F1E1D] border border-[#E8E5DF]">/plan</kbd>
          <span>Plan opérationnel</span>
        </button>
        <button
          type="button"
          onClick={() => {
            aui.composer.setText("[Données Ventes] Analyse détaillée des ventes et marges du mois en cours : ");
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E8E5DF] hover:border-[#0E7C5A] hover:text-[#1F1E1D] transition-colors shadow-2xs"
        >
          <kbd className="bg-[#FAF8F5] px-1.5 py-0.5 rounded font-mono text-[#1F1E1D] border border-[#E8E5DF]">@ventes</kbd>
          <span>Données POS</span>
        </button>
        <button
          type="button"
          onClick={() => {
            aui.composer.setText("Analyse mes plats phares selon la matrice d'ingénierie de menu (Stars, Plowhorses, Puzzles, Dogs).");
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E8E5DF] hover:border-[#0E7C5A] hover:text-[#1F1E1D] transition-colors shadow-2xs"
        >
          <kbd className="bg-[#FAF8F5] px-1.5 py-0.5 rounded font-mono text-[#1F1E1D] border border-[#E8E5DF]">/menu</kbd>
          <span>Menu Engineering</span>
        </button>
      </div>
    </div>
  );
}
