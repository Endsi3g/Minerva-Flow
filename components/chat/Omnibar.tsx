"use client";


import { useTranslations } from "next-intl";
import React, { useState, useRef, useEffect } from "react";
import {
  ArrowUp,
  Paperclip,
  X,
  FileText,
  ImageIcon,
  Mic,
  ChevronDown,
  Check,
  TrendingUp,
  Package,
  Utensils,
} from "lucide-react";
import type { SlashCommandDef, ContextMentionDef } from "@/lib/types/generative-ui";
import { cn } from "@/lib/utils";

function buildSLASH_COMMANDS(t: (key: string) => string): SlashCommandDef[] {
  return [
  {
    command: "/plan",
    label: t("operationalActionPlan"),
    description: t("generatesARestockingAnd"),
    category: "operations",
    promptTemplate: t("generateACompleteOperational"),
  },
  {
    command: "/audit",
    label: t("profitabilityMarginAudit"),
    description: t("inDepthAnalysisOf"),
    category: "audit",
    promptTemplate: t("runADetailedAudit"),
  },
  {
    command: "/menu",
    label: "Menu Engineering Matrix",
    description: t("categorizesDishesIntoStars"),
    category: "menu",
    promptTemplate: t("analyzeTheMenuUsing"),
  },
  {
    command: "/export",
    label: t("exportSummaryReport"),
    description: t("preparesAnArtifactExportable"),
    category: "export",
    promptTemplate: t("generateAConsolidatedOperating"),
  },
];
}

function buildCONTEXT_MENTIONS(t: (key: string) => string): ContextMentionDef[] {
  return [
  {
    mention: "@ventes",
    label: t("registerData"),
    description: t("salesCoversAverageTicket"),
    category: "pos",
    snippet: t("registerSalesData"),
  },
  {
    mention: "@stocks",
    label: t("inventoryIngredientCosts"),
    description: t("stockValueStockoutsAnd"),
    category: "inventory",
    snippet: t("inventoryStockData"),
  },
  {
    mention: "@menu",
    label: "Carte & Tarification",
    description: t("sellingPricesUnitMargins"),
    category: "menu",
    snippet: t("menuDishesData"),
  },
  {
    mention: "@staff",
    label: "Planning & Masse Salariale",
    description: t("hoursWorkedProductivityRatios"),
    category: "staff",
    snippet: t("staffingHoursData"),
  },
];
}

export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export function Omnibar({
  onSendMessage,
  disabled = false,
  placeholder = "Posez une question, tapez '/' pour une commande ou '@' pour une source...",
}: {
  onSendMessage: (
    message: string,
    attachments: FileAttachment[],
    model: string,
    mode: "chat" | "cowork"
  ) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const t = useTranslations("omnibar");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [activeMode, setActiveMode] = useState<"chat" | "cowork">("chat");
  const [selectedModel, setSelectedModel] = useState("gemini-3.7-flash");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Popover state
  const [triggerType, setTriggerType] = useState<"/" | "@" | null>(null);
  const [triggerQuery, setTriggerQuery] = useState("");
  const [popoverIndex, setPopoverIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    const lastWord = val.split(/\s+/).pop() || "";
    if (lastWord.startsWith("/")) {
      setTriggerType("/");
      setTriggerQuery(lastWord.slice(1).toLowerCase());
      setPopoverIndex(0);
    } else if (lastWord.startsWith("@")) {
      setTriggerType("@");
      setTriggerQuery(lastWord.slice(1).toLowerCase());
      setPopoverIndex(0);
    } else {
      setTriggerType(null);
      setTriggerQuery("");
    }
  };

  const filteredCommands = buildSLASH_COMMANDS(t).filter(
    (c) =>
      c.command.toLowerCase().includes(triggerQuery) ||
      c.label.toLowerCase().includes(triggerQuery)
  );

  const filteredMentions = buildCONTEXT_MENTIONS(t).filter(
    (m) =>
      m.mention.toLowerCase().includes(triggerQuery) ||
      m.label.toLowerCase().includes(triggerQuery)
  );

  const handleSelectCommand = (cmd: SlashCommandDef) => {
    const words = message.split(/\s+/);
    words.pop();
    const prefix = words.length > 0 ? words.join(" ") + " " : "";
    setMessage(prefix + cmd.promptTemplate);
    setTriggerType(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleSelectMention = (m: ContextMentionDef) => {
    const words = message.split(/\s+/);
    words.pop();
    const prefix = words.length > 0 ? words.join(" ") + " " : "";
    setMessage(prefix + m.snippet);
    setTriggerType(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    const newItems: FileAttachment[] = Array.from(files).map((f) => ({
      id: String(Date.now() + Math.random()),
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));

    setAttachments((prev) => [...prev, ...newItems]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSend = () => {
    if (disabled || (!message.trim() && attachments.length === 0)) return;
    onSendMessage(message, attachments, selectedModel, activeMode);
    setMessage("");
    setAttachments([]);
    setTriggerType(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (triggerType) {
      const listLength = triggerType === "/" ? filteredCommands.length : filteredMentions.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPopoverIndex((prev) => (prev + 1) % listLength);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPopoverIndex((prev) => (prev - 1 + listLength) % listLength);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (triggerType === "/" && filteredCommands[popoverIndex]) {
          handleSelectCommand(filteredCommands[popoverIndex]);
        } else if (triggerType === "@" && filteredMentions[popoverIndex]) {
          handleSelectMention(filteredMentions[popoverIndex]);
        }
        return;
      }
      if (e.key === "Escape") {
        setTriggerType(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !disabled;

  return (
    <div
      className="relative w-full max-w-3xl mx-auto select-none"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
      }}
    >
      {/* Drag Over Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#0E7C5A]/10 border-2 border-dashed border-[#0E7C5A] rounded-2xl flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs font-bold text-[#0E7C5A] flex items-center gap-2">
            <Paperclip size={14} />
            {t("dropYourRegisterFiles")}
          </p>
        </div>
      )}

      {/* Popover Autocomplete Menu */}
      {triggerType && (
        <div
          ref={popoverRef}
          className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-[#E2E0D8] rounded-2xl shadow-xl z-40 p-1.5 text-left animate-in fade-in zoom-in-95"
        >
          <div className="px-2.5 py-1 text-[12px] font-mono font-bold text-[#8A887F] uppercase tracking-wider border-b border-[#F0EFEA] mb-1">
            {triggerType === "/" ? "Commandes d'audit disponibles" : t("connectedDataSources")}
          </div>

          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {triggerType === "/" ? (
              filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.command}
                    type="button"
                    onClick={() => handleSelectCommand(cmd)}
                    className={cn(
                      "w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors",
                      idx === popoverIndex
                        ? "bg-[#0E7C5A]/10 text-[#0E7C5A]"
                        : "hover:bg-black/[0.04] text-[#1F1E1D]"
                    )}
                  >
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 border border-[#E8E5DF] text-[12px]">
                      {cmd.command}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{cmd.label}</p>
                      <p className="text-[12px] text-[#8A887F] truncate">{cmd.description}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-[#8A887F]">{t("noCommandFound")}</div>
              )
            ) : (
              filteredMentions.length > 0 ? (
                filteredMentions.map((m, idx) => (
                  <button
                    key={m.mention}
                    type="button"
                    onClick={() => handleSelectMention(m)}
                    className={cn(
                      "w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors",
                      idx === popoverIndex
                        ? "bg-[#0E7C5A]/10 text-[#0E7C5A]"
                        : "hover:bg-black/[0.04] text-[#1F1E1D]"
                    )}
                  >
                    <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 border border-[#E8E5DF] text-[12px]">
                      {m.mention}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{m.label}</p>
                      <p className="text-[12px] text-[#8A887F] truncate">{m.description}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-[#8A887F]">{t("noMentionFound")}</div>
              )
            )}
          </div>
        </div>
      )}

      {/* Main Omnibar Container */}
      <div className="bg-white border border-[#E2E0D8] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] flex flex-col transition-all focus-within:border-[#0E7C5A] focus-within:ring-2 focus-within:ring-[#0E7C5A]/15">
        
        {/* Attachment Chips Header */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2.5 pb-0 border-b border-[#F0EFEA]">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E2E0D8] text-xs shadow-2xs group"
              >
                {att.previewUrl ? (
                  <ImageIcon size={12} className="text-[#0E7C5A]" />
                ) : (
                  <FileText size={12} className="text-[#0E7C5A]" />
                )}
                <span className="font-semibold text-[#1F1E1D] truncate max-w-[120px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="text-[#8A887F] hover:text-[#1F1E1D] ml-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full p-3.5 sm:p-4 bg-transparent font-sans text-xs sm:text-sm text-[#1F1E1D] placeholder:text-[#8A887F] focus:outline-none resize-none min-h-[70px] max-h-36 leading-relaxed"
          rows={1}
        />

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#F0EFEA] bg-[#FAF8F5]/60 rounded-b-2xl">
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 w-7 rounded-lg text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.05] transition-colors flex items-center justify-center"
              title="Joindre un fichier"
            >
              <Paperclip size={14} />
            </button>

            {/* Chat / Cowork Mode Pills */}
            <div className="flex items-center bg-white border border-[#E2E0D8] rounded-lg p-0.5 text-[12px] font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveMode("chat")}
                className={cn(
                  "px-2 py-0.5 rounded transition-all",
                  activeMode === "chat"
                    ? "bg-[#0E7C5A] text-white"
                    : "text-[#8A887F] hover:text-[#1F1E1D]"
                )}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("cowork")}
                className={cn(
                  "px-2 py-0.5 rounded transition-all",
                  activeMode === "cowork"
                    ? "bg-[#0E7C5A] text-white"
                    : "text-[#8A887F] hover:text-[#1F1E1D]"
                )}
              >
                Cowork
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Model Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.05] transition-colors bg-white border border-[#E2E0D8] shadow-2xs"
              >
                <span className="truncate max-w-[110px]">
                  {selectedModel === "gemini-3.7-flash" ? "Gemini 3.7 Flash" : "Claude 3.5 Sonnet"}
                </span>
                <ChevronDown size={11} className="opacity-70" />
              </button>

              {modelDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-1.5 w-60 bg-white border border-[#E2E0D8] rounded-xl shadow-xl z-30 p-1 text-left">
                  <button
                    type="button"
                    onClick={() => { setSelectedModel("gemini-3.7-flash"); setModelDropdownOpen(false); }}
                    className={cn(
                      "w-full text-left p-2 rounded-lg text-xs flex items-center justify-between",
                      selectedModel === "gemini-3.7-flash" ? "bg-[#0E7C5A]/10 text-[#0E7C5A]" : "hover:bg-gray-50"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-[12px]">Gemini 3.7 Flash</p>
                      <p className="text-[12px] text-[#8A887F]">{t("recommendedHighSpeed")}</p>
                    </div>
                    {selectedModel === "gemini-3.7-flash" && <Check size={13} className="text-[#0E7C5A]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedModel("claude-3.5-sonnet"); setModelDropdownOpen(false); }}
                    className={cn(
                      "w-full text-left p-2 rounded-lg text-xs flex items-center justify-between",
                      selectedModel === "claude-3.5-sonnet" ? "bg-[#0E7C5A]/10 text-[#0E7C5A]" : "hover:bg-gray-50"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-[12px]">Claude 3.5 Sonnet</p>
                      <p className="text-[12px] text-[#8A887F]">{t("analyticalReasoning")}</p>
                    </div>
                    {selectedModel === "claude-3.5-sonnet" && <Check size={13} className="text-[#0E7C5A]" />}
                  </button>
                </div>
              )}
            </div>

            {/* Mic */}
            <button
              type="button"
              className="h-7 w-7 rounded-lg text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.05] transition-colors flex items-center justify-center"
              title={t("voiceDictation")}
            >
              <Mic size={13} />
            </button>

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center transition-all shadow-2xs",
                canSend
                  ? "bg-[#0E7C5A] hover:bg-[#0A6348] text-white active:scale-95"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <ArrowUp size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Helper Shortcut Pills below Omnibar */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-2.5 text-[12px] text-[#8A887F]">
        <button
          type="button"
          onClick={() => {
            setMessage(t("runAFullAudit"));
            if (textareaRef.current) textareaRef.current.focus();
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E8E5DF] hover:border-[#0E7C5A] hover:text-[#1F1E1D] transition-colors shadow-2xs"
        >
          <TrendingUp size={10} className="text-[#0E7C5A]" />
          <span>{t("marginAudit")}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMessage(t("analyzeMyMenuUsing"));
            if (textareaRef.current) textareaRef.current.focus();
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E8E5DF] hover:border-[#0E7C5A] hover:text-[#1F1E1D] transition-colors shadow-2xs"
        >
          <Utensils size={10} className="text-[#0E7C5A]" />
          <span>{t("menuEngineering")}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMessage(t("generateARestockingPlan"));
            if (textareaRef.current) textareaRef.current.focus();
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E8E5DF] hover:border-[#0E7C5A] hover:text-[#1F1E1D] transition-colors shadow-2xs"
        >
          <Package size={10} className="text-[#0E7C5A]" />
          <span>{t("stockPlan")}</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />
    </div>
  );
}
