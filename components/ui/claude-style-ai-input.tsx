"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  ArrowUp,
  X,
  ImageIcon,
  ChevronDown,
  Check,
  Loader2,
  Copy,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
export interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  type: string;
  uploadStatus: "pending" | "uploading" | "complete" | "error";
  uploadProgress?: number;
  abortController?: AbortController;
  textContent?: string;
}

export interface PastedContent {
  id: string;
  content: string;
  timestamp: Date;
  wordCount: number;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export interface ChatInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSendMessage?: (
    message: string,
    files: FileWithPreview[],
    pastedContent: PastedContent[]
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  models?: ModelOption[];
  defaultModel?: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
}

// Constants
const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const PASTE_THRESHOLD = 200;

export const DEFAULT_MODELS: ModelOption[] = [
  {
    id: "sonnet-5-moyen",
    name: "Sonnet 5 Moyen",
    description: "Modèle équilibré, intelligent et rapide",
    badge: "Actif",
  },
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    description: "Modèle ultra-rapide pour audits d'exploitation",
    badge: "Recommandé",
  },
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "Modèle analytique pour calculs complexes",
  },
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const isTextualFile = (file: File): boolean => {
  const textualTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/typescript",
    "application/pdf",
  ];

  const textualExtensions = [
    "txt", "md", "py", "js", "ts", "jsx", "tsx", "html", "htm", "css", "scss",
    "json", "xml", "yaml", "yml", "csv", "sql", "sh", "pdf",
  ];

  const isTextualMimeType = textualTypes.some((type) =>
    file.type.toLowerCase().startsWith(type)
  );

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return isTextualMimeType || textualExtensions.includes(extension);
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const getFileExtension = (filename: string): string => {
  const extension = filename.split(".").pop()?.toUpperCase() || "FILE";
  return extension.length > 7 ? extension.substring(0, 7) : extension;
};

// Textual/Code File Preview Card (Image 2 Style)
const TextualFilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const previewText = file.textContent?.slice(0, 140) || "";
  const fileExtension = getFileExtension(file.file.name);

  return (
    <div className="relative group bg-[#FAF8F5] border border-[#E2E0D8] rounded-xl p-3 size-[135px] shadow-xs shrink-0 overflow-hidden text-left flex flex-col justify-between">
      <div className="text-[9.5px] font-mono text-[#5A5851] leading-tight line-clamp-5 overflow-hidden break-all select-none">
        {file.textContent ? (
          previewText
        ) : (
          <div className="flex flex-col items-center justify-center h-full pt-4 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin text-[#D97757]" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#E8E5DF]/60">
        <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#E2E0D8] text-[#1F1E1D] shadow-2xs">
          {fileExtension}
        </span>
        <span className="text-[9px] text-[#8A887F] font-mono truncate max-w-[60px]">
          {formatFileSize(file.file.size)}
        </span>
      </div>

      <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-200 flex items-center gap-1 absolute top-1.5 right-1.5">
        {file.textContent && (
          <button
            type="button"
            className="h-5 w-5 rounded bg-white border border-[#E2E0D8] text-[#5A5851] hover:text-[#1F1E1D] flex items-center justify-center shadow-xs"
            onClick={() => navigator.clipboard.writeText(file.textContent || "")}
            title="Copier"
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
        )}
        <button
          type="button"
          className="h-5 w-5 rounded bg-white border border-[#E2E0D8] text-[#5A5851] hover:text-[#1F1E1D] flex items-center justify-center shadow-xs"
          onClick={() => onRemove(file.id)}
          title="Supprimer"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
};

// Image Preview Card (Image 2 Style)
const ImagePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  return (
    <div className="relative group bg-gray-100 border border-[#E2E0D8] rounded-xl size-[135px] shadow-xs shrink-0 overflow-hidden">
      {file.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.preview}
          alt={file.file.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <ImageIcon className="h-6 w-6 text-gray-400" />
        </div>
      )}

      <button
        type="button"
        className="absolute top-1.5 right-1.5 h-6 w-6 rounded bg-white/90 border border-black/10 text-[#1F1E1D] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
        onClick={() => onRemove(file.id)}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

// Pasted Content Card (Image 2 Style - PASTED Tag)
const PastedContentCard: React.FC<{
  content: PastedContent;
  onRemove: (id: string) => void;
}> = ({ content, onRemove }) => {
  return (
    <div className="relative group bg-[#FAF8F5] border border-[#E2E0D8] rounded-xl p-3 size-[135px] shadow-xs shrink-0 overflow-hidden text-left flex flex-col justify-between">
      <div className="text-[9.5px] font-mono text-[#5A5851] leading-tight line-clamp-5 overflow-hidden break-all select-none">
        {content.content.slice(0, 140)}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#E8E5DF]/60">
        <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1F1E1D] text-white">
          PASTED
        </span>
        <span className="text-[9px] text-[#8A887F] font-mono">
          {content.wordCount} mots
        </span>
      </div>

      <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-200 flex items-center gap-1 absolute top-1.5 right-1.5">
        <button
          type="button"
          className="h-5 w-5 rounded bg-white border border-[#E2E0D8] text-[#5A5851] hover:text-[#1F1E1D] flex items-center justify-center shadow-xs"
          onClick={() => navigator.clipboard.writeText(content.content)}
          title="Copier"
        >
          <Copy className="h-2.5 w-2.5" />
        </button>
        <button
          type="button"
          className="h-5 w-5 rounded bg-white border border-[#E2E0D8] text-[#5A5851] hover:text-[#1F1E1D] flex items-center justify-center shadow-xs"
          onClick={() => onRemove(content.id)}
          title="Supprimer"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
};

// Model Selector Dropdown
const ModelSelectorDropdown: React.FC<{
  models: ModelOption[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}> = ({ models, selectedModel, onModelChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModelData =
    models.find((m) => m.id === selectedModel) || models[0];
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.04] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate max-w-[120px] sm:max-w-[160px]">
          {selectedModelData?.name || "Sonnet 5 Moyen"}
        </span>
        <ChevronDown
          className={cn(
            "ml-0.5 h-3.5 w-3.5 transition-transform opacity-70",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-[#E2E0D8] rounded-2xl shadow-xl z-30 p-1.5 text-left animate-in fade-in zoom-in-95">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              className={cn(
                "w-full text-left p-2.5 rounded-xl hover:bg-black/[0.04] transition-colors flex items-center justify-between",
                model.id === selectedModel && "bg-[#D97757]/10 text-[#D97757]"
              )}
              onClick={() => {
                onModelChange(model.id);
                setIsOpen(false);
              }}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-[#1F1E1D]">
                    {model.name}
                  </span>
                  {model.badge && (
                    <span className="px-1.5 py-0.2 text-[9.5px] bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/30 rounded-full font-semibold">
                      {model.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8A887F] mt-0.5 truncate">
                  {model.description}
                </p>
              </div>
              {model.id === selectedModel && (
                <Check className="h-4 w-4 text-[#D97757] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Main ClaudeChatInput (Pixel-Perfect Light Mode - Image 3 & Image 2)
export const ClaudeChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Comment puis-je vous aider ?",
  maxFiles = MAX_FILES,
  maxFileSize = MAX_FILE_SIZE,
  acceptedFileTypes,
  models = DEFAULT_MODELS,
  defaultModel,
  onModelChange,
  className = "",
  value,
  onChange,
}) => {
  const [internalMessage, setInternalMessage] = useState("");
  const isControlled = value !== undefined;
  const message = isControlled ? value : internalMessage;

  const [activeTab, setActiveTab] = useState<"chat" | "cowork">("chat");

  const setMessage = useCallback(
    (val: string) => {
      if (isControlled) {
        onChange?.(val);
      } else {
        setInternalMessage(val);
      }
    },
    [isControlled, onChange]
  );

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [pastedContent, setPastedContent] = useState<PastedContent[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    defaultModel || models[0]?.id || "sonnet-5-moyen"
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight = 160;
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        maxHeight
      )}px`;
    }
  }, [message]);

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const currentFileCount = files.length;
      if (currentFileCount >= maxFiles) {
        alert(`Maximum ${maxFiles} fichiers autorisés.`);
        return;
      }

      const availableSlots = maxFiles - currentFileCount;
      const filesToAdd = Array.from(selectedFiles).slice(0, availableSlots);

      const newFiles: FileWithPreview[] = filesToAdd
        .filter((file) => {
          if (file.size > maxFileSize) {
            alert(
              `Le fichier ${file.name} (${formatFileSize(
                file.size
              )}) dépasse la limite de ${formatFileSize(maxFileSize)}.`
            );
            return false;
          }
          return true;
        })
        .map((file) => ({
          id: String(Date.now() + Math.random()),
          file,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
          type: file.type || "application/octet-stream",
          uploadStatus: "pending",
          uploadProgress: 0,
        }));

      setFiles((prev) => [...prev, ...newFiles]);

      newFiles.forEach((fileToUpload) => {
        if (isTextualFile(fileToUpload.file)) {
          readFileAsText(fileToUpload.file)
            .then((textContent) => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileToUpload.id ? { ...f, textContent } : f
                )
              );
            })
            .catch(() => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileToUpload.id
                    ? { ...f, textContent: "Contenu analysé" }
                    : f
                )
              );
            });
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileToUpload.id ? { ...f, uploadStatus: "complete" } : f
          )
        );
      });
    },
    [files.length, maxFiles, maxFileSize]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const clipboardData = e.clipboardData;
      const items = clipboardData.items;

      const fileItems = Array.from(items).filter((item) => item.kind === "file");
      if (fileItems.length > 0 && files.length < maxFiles) {
        e.preventDefault();
        const pastedFiles = fileItems
          .map((item) => item.getAsFile())
          .filter(Boolean) as File[];
        const dataTransfer = new DataTransfer();
        pastedFiles.forEach((file) => dataTransfer.items.add(file));
        handleFileSelect(dataTransfer.files);
        return;
      }

      const textData = clipboardData.getData("text");
      if (
        textData &&
        textData.length > PASTE_THRESHOLD &&
        pastedContent.length < 5
      ) {
        e.preventDefault();
        setMessage(message + textData.slice(0, PASTE_THRESHOLD) + "...");

        const pastedItem: PastedContent = {
          id: String(Date.now() + Math.random()),
          content: textData,
          timestamp: new Date(),
          wordCount: textData.split(/\s+/).filter(Boolean).length,
        };

        setPastedContent((prev) => [...prev, pastedItem]);
      }
    },
    [handleFileSelect, files.length, maxFiles, pastedContent.length, message, setMessage]
  );

  const handleSend = useCallback(() => {
    if (
      disabled ||
      (!message.trim() && files.length === 0 && pastedContent.length === 0)
    )
      return;

    onSendMessage?.(message, files, pastedContent);

    setMessage("");
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [message, files, pastedContent, disabled, onSendMessage, setMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const hasContent =
    message.trim() || files.length > 0 || pastedContent.length > 0;
  const canSend = hasContent && !disabled;

  return (
    <div
      className={cn("relative w-full max-w-2xl mx-auto select-none", className)}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files);
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#D97757]/10 border-2 border-dashed border-[#D97757] rounded-2xl flex flex-col items-center justify-center pointer-events-none">
          <p className="text-sm font-semibold text-[#D97757] flex items-center gap-2">
            <ImageIcon className="size-4" />
            Déposez vos fichiers pour les analyser
          </p>
        </div>
      )}

      {/* Solid White Card Matching Image 3 & 2 */}
      <div className="bg-white border border-[#E2E0D8] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col transition-all focus-within:border-[#D97757] focus-within:ring-2 focus-within:ring-[#D97757]/15">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full p-4 bg-transparent font-sans text-[#1F1E1D] placeholder:text-[#8A887F] focus:outline-none resize-none text-sm sm:text-base leading-relaxed max-h-48 min-h-[90px]"
          rows={1}
        />

        {/* Bottom Toolbar (Image 3) */}
        <div className="flex items-center justify-between w-full px-3 py-2 border-t border-[#F0EFEA]">
          <div className="flex items-center gap-2">
            {/* + Attachment Button */}
            <button
              type="button"
              className="h-8 w-8 rounded-lg text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.05] transition-colors flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || files.length >= maxFiles}
              title="Joindre des fichiers"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Chat | Cowork Mode Pills (Image 3) */}
            <div className="flex items-center bg-[#F5F3ED] border border-[#E8E5DF] rounded-xl p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  activeTab === "chat"
                    ? "bg-white text-[#1F1E1D] shadow-2xs"
                    : "text-[#8A887F] hover:text-[#1F1E1D]"
                )}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cowork")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  activeTab === "cowork"
                    ? "bg-white text-[#1F1E1D] shadow-2xs"
                    : "text-[#8A887F] hover:text-[#1F1E1D]"
                )}
              >
                Cowork
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Model Selector (Sonnet 5 Moyen ⌄) */}
            {models && models.length > 0 && (
              <ModelSelectorDropdown
                models={models}
                selectedModel={selectedModel}
                onModelChange={(mId) => {
                  setSelectedModel(mId);
                  onModelChange?.(mId);
                }}
              />
            )}

            {/* Microphone Icon Button (Image 3) */}
            <button
              type="button"
              className="h-8 w-8 rounded-lg text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.05] transition-colors flex items-center justify-center"
              title="Dictée vocale"
            >
              <Mic className="h-4 w-4" />
            </button>

            {/* Terracotta/Orange Send Button (Image 2) */}
            <button
              type="button"
              className={cn(
                "h-8 w-8 rounded-xl transition-all flex items-center justify-center shadow-xs",
                canSend
                  ? "bg-[#D97757] hover:bg-[#C26547] text-white active:scale-95"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
              onClick={handleSend}
              disabled={!canSend}
              title="Envoyer le message"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Attached Files & Pasted Content Row (Image 2) */}
        {(files.length > 0 || pastedContent.length > 0) && (
          <div className="overflow-x-auto border-t border-[#F0EFEA] p-3 w-full bg-[#FAF8F5] rounded-b-2xl">
            <div className="flex gap-3">
              {pastedContent.map((content) => (
                <PastedContentCard
                  key={content.id}
                  content={content}
                  onRemove={(id) =>
                    setPastedContent((prev) => prev.filter((c) => c.id !== id))
                  }
                />
              ))}
              {files.map((file) =>
                file.type.startsWith("image/") ? (
                  <ImagePreviewCard
                    key={file.id}
                    file={file}
                    onRemove={removeFile}
                  />
                ) : (
                  <TextualFilePreviewCard
                    key={file.id}
                    file={file}
                    onRemove={removeFile}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={acceptedFileTypes?.join(",")}
        onChange={(e) => {
          handleFileSelect(e.target.files);
          if (e.target) e.target.value = "";
        }}
      />
    </div>
  );
};
