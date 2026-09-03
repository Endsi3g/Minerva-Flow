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
  Plus,
  FileText,
  Mic,
  MicOff,
  ChevronDown,
  Star,
  Mail,
  Globe,
  Target,
  Zap,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PROMPT_CHIPS = [
  {
    label: "Daily Standup & Briefing",
    icon: Zap,
    prompt: "Génère le briefing du service de ce soir avec les objectifs de vente, les tables VIP et les consignes de suggestive selling.",
  },
  {
    label: "Analyser le Prime Cost",
    icon: TrendingUp,
    prompt: "Audite le Prime Cost actuel du restaurant en comparant le Food Cost et le Labor Cost au seuil de 60 %.",
  },
  {
    label: "Rédiger une relance client",
    icon: Mail,
    prompt: "Rédige une relance personnalisée pour nos clients Habitués inactifs depuis plus de 14 jours avec une offre incitative.",
  },
  {
    label: "Plats Stars & BCG",
    icon: Star,
    prompt: "Analyse la carte actuelle selon la matrice BCG (Stars, Plowhorses, Puzzles, Dogs) et identifie les plats prioritaires.",
  },
  {
    label: "Fiche technique & Recette",
    icon: FileText,
    prompt: "Rédige la fiche technique complète d'un plat signature avec grammages, coûts portions et ratio Food Cost cible.",
  },
  {
    label: "Recherche dans les SOPs",
    icon: Globe,
    prompt: "Recherche dans nos SOPs et protocoles d'exploitation les consignes d'ouverture et de fermeture de salle.",
  },
  {
    label: "Priorités du service",
    icon: Target,
    prompt: "Quelles sont les 3 actions opérationnelles prioritaires à mener aujourd'hui pour maximiser notre rentabilité ?",
  },
  {
    label: "Rapport de clôture caisse",
    icon: BarChart3,
    prompt: "Génère un rapport de clôture de service synthétique avec le ticket moyen, les couverts et le contrôle des encaissements.",
  },
];

export function Thread({
  userName = "Directeur d'exploitation",
  isCanvasOpen,
  onToggleCanvas,
  selectedModel = "Gemini 3.7",
  onSelectModel,
}: {
  userName?: string;
  isCanvasOpen?: boolean;
  onToggleCanvas?: () => void;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 17 ? "Bon après-midi" : "Bonsoir";

  return (
    <ThreadPrimitive.Root className="flex h-full w-full flex-col bg-white overflow-hidden relative font-sans text-[#1F1E1D]">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Editorial Welcome Screen — Exact 1:1 match with Image 2 (minerva-os-lite-desktop) */}
          <ThreadPrimitive.Empty>
            <div className="flex flex-col items-center justify-center min-h-[62vh] px-4 py-8 text-center animate-in fade-in zoom-in-95 duration-300">
              {/* Emerald Minerva squircle icon */}
              <div className="flex items-center justify-center mb-4">
                <div className="h-14 w-14 rounded-2xl bg-[#059669] flex items-center justify-center shadow-lg shadow-[#059669]/20 border border-emerald-400/30">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
              </div>

              {/* Dynamic greeting & context subtitle */}
              <h1 className="text-2xl sm:text-3xl font-black text-[#26251e] tracking-tight">
                {greeting}
              </h1>
              <p className="text-sm text-[#7a7a76] font-medium mt-1 mb-8">
                Votre espace restaurant est prêt.
              </p>

              {/* Claude-style composer centered */}
              <div className="w-full max-w-[680px] mb-6">
                <MultifunctionComposer
                  isCanvasOpen={isCanvasOpen}
                  onToggleCanvas={onToggleCanvas}
                  selectedModel={selectedModel}
                  onSelectModel={onSelectModel}
                />
              </div>

              {/* 8 Prompt Chips below composer */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-[720px]">
                {PROMPT_CHIPS.map((chip, idx) => {
                  const ChipIcon = chip.icon;
                  return (
                    <ThreadPrimitive.Suggestion
                      key={idx}
                      prompt={chip.prompt}
                      method="replace"
                      autoSend
                      asChild
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#e0e0dc] bg-white hover:bg-neutral-50 hover:border-neutral-300 text-xs font-semibold text-[#555552] hover:text-[#26251e] shadow-2xs transition-all active:scale-95 cursor-pointer"
                      >
                        <ChipIcon size={13} className="text-[#059669]" />
                        <span>{chip.label}</span>
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

      {/* Floating Modernized Composer when conversation has messages */}
      <ThreadPrimitive.If empty={false}>
        <div className="p-3 sm:p-5 bg-gradient-to-t from-white via-white to-transparent sticky bottom-0 z-10">
          <div className="max-w-3xl mx-auto">
            <MultifunctionComposer
              isCanvasOpen={isCanvasOpen}
              onToggleCanvas={onToggleCanvas}
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
            />
          </div>
        </div>
      </ThreadPrimitive.If>
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

function MultifunctionComposer({
  isCanvasOpen,
  onToggleCanvas,
  selectedModel = "Gemini 3.7",
  onSelectModel,
}: {
  isCanvasOpen?: boolean;
  onToggleCanvas?: () => void;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
}) {
  const [popoverTrigger, setPopoverTrigger] = useState<"/" | "@" | null>(null);
  const [popoverQuery, setPopoverQuery] = useState("");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
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

  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("La reconnaissance vocale n'est pas supportée par ce navigateur.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "fr-FR";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const current = aui.composer.getState().text || "";
          aui.composer.setText(current ? `${current} ${transcript}` : transcript);
        }
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="relative select-none w-full">
      {/* Autocomplete Popover */}
      {popoverTrigger && (
        <ChatCommandPopover
          triggerType={popoverTrigger}
          query={popoverQuery}
          onSelect={handleSelectCommand}
          onClose={() => setPopoverTrigger(null)}
        />
      )}

      <ComposerPrimitive.Root className="w-full flex flex-col rounded-3xl border border-[#e0e0dc] bg-white shadow-md hover:shadow-lg transition-all focus-within:border-[#059669] focus-within:ring-2 focus-within:ring-[#059669]/15 p-2 sm:p-3 relative z-20">
        {/* Attachments preview list */}
        <div className="flex flex-wrap gap-2 p-2 pb-0 empty:hidden">
          <ComposerPrimitive.Attachments
            components={{
              Attachment: AttachmentPreview,
            }}
          />
        </div>

        {/* Text input */}
        <ComposerPrimitive.Input
          rows={2}
          autoFocus
          onChange={handleInputChange}
          placeholder="Comment puis-je vous aider aujourd'hui ?"
          className="w-full resize-none text-[14px] sm:text-[14.5px] text-[#26251e] bg-transparent outline-none placeholder:text-neutral-400 px-3 py-2 border-0 min-h-[44px] max-h-40 overflow-y-auto leading-relaxed"
        />

        {/* Controls row matching Image 2 */}
        <div className="flex items-center justify-between px-2 pt-1 border-t border-[#f4f4f3] mt-1">
          <div className="flex items-center gap-2">
            <ComposerPrimitive.AddAttachment asChild>
              <button
                type="button"
                className="h-8 w-8 rounded-full border border-[#e0e0dc] bg-white hover:bg-[#f4f4f3] text-[#7a7a76] flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                title="Ajouter un fichier ou document"
              >
                <Plus size={15} />
              </button>
            </ComposerPrimitive.AddAttachment>

            <button
              type="button"
              onClick={onToggleCanvas}
              className={cn(
                "h-8 px-3 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer",
                isCanvasOpen
                  ? "bg-[#059669]/10 text-[#059669] border-[#059669]/40 font-bold"
                  : "border-[#e0e0dc] bg-white text-[#7a7a76] hover:bg-[#f4f4f3] hover:text-[#26251e]"
              )}
              title="Ouvrir le volet Canvas TipTap"
            >
              <FileText size={13.5} />
              <span>Canvas</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Model selector dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelMenuOpen((v) => !v)}
                className="h-8 px-3 rounded-full border border-[#e0e0dc] bg-white hover:bg-[#f4f4f3] flex items-center gap-1.5 text-xs font-semibold text-[#555552] transition-colors shadow-2xs cursor-pointer"
              >
                <span>{selectedModel}</span>
                <ChevronDown size={13} className="text-neutral-400" />
              </button>

              {modelMenuOpen && (
                <div className="absolute right-0 bottom-10 z-50 bg-white border border-[#e6e5e0] rounded-xl py-1 shadow-lg w-48 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[8px] font-bold text-[#7a7a76] uppercase tracking-wider">
                    Modèle d'Intelligence
                  </div>
                  {["Gemini 3.7", "Gemini 3.5 Pro"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        onSelectModel?.(m);
                        setModelMenuOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-[11px] font-bold flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer",
                        selectedModel === m ? "text-[#059669]" : "text-[#26251e]"
                      )}
                    >
                      <span>{m}</span>
                      {selectedModel === m && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mic speech recognition */}
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "h-8 w-8 rounded-full border flex items-center justify-center transition-all shadow-2xs cursor-pointer",
                isListening
                  ? "bg-red-50 text-red-600 border-red-300 animate-pulse"
                  : "border-[#e0e0dc] bg-white text-[#7a7a76] hover:bg-[#f4f4f3] hover:text-[#26251e]"
              )}
              title={isListening ? "Arrêter la dictée" : "Dictée vocale"}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            {/* Send circle button */}
            <ComposerPrimitive.Send asChild>
              <button
                type="button"
                className="h-8 w-8 shrink-0 rounded-full bg-[#1a1e16] hover:bg-black text-white shadow-xs flex items-center justify-center transition-all disabled:opacity-35 cursor-pointer"
                title="Envoyer"
              >
                <ArrowUp size={15} />
              </button>
            </ComposerPrimitive.Send>

            <ComposerPrimitive.Cancel asChild>
              <button
                type="button"
                className="h-8 w-8 shrink-0 rounded-full bg-[#1a1e16] text-white shadow-xs hover:bg-black transition-all flex items-center justify-center cursor-pointer"
                title="Annuler"
              >
                <Square size={12} />
              </button>
            </ComposerPrimitive.Cancel>
          </div>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
}
