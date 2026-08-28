"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  SlidersHorizontal,
  ArrowUp,
  X,
  ImageIcon,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
  Copy,
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
const DEFAULT_MODELS_INTERNAL: ModelOption[] = [
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    description: "Modèle hybride vitesse et analyse d'exploitation avancée",
    badge: "Actif",
  },
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "Modèle équilibré et analytique",
    badge: "Latest",
  },
  {
    id: "claude-opus-3.5",
    name: "Claude Opus 3.5",
    description: "Intelligence maximale pour audits complexes",
  },
  {
    id: "claude-haiku-3",
    name: "Claude Haiku 3",
    description: "Réponses ultra-rapides du quotidien",
  },
];

const getFileTypeLabel = (type: string): string => {
  const parts = type.split("/");
  let label = parts[parts.length - 1].toUpperCase();
  if (label.length > 7 && label.includes("-")) {
    label = label.substring(0, label.indexOf("-"));
  }
  if (label.length > 10) {
    label = label.substring(0, 10) + "...";
  }
  return label;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
};

const isTextualFile = (file: File): boolean => {
  const textualTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/typescript",
  ];

  const textualExtensions = [
    "txt",
    "md",
    "py",
    "js",
    "ts",
    "jsx",
    "tsx",
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "json",
    "xml",
    "yaml",
    "yml",
    "csv",
    "sql",
    "sh",
    "bash",
    "php",
    "rb",
    "go",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "cs",
    "rs",
    "swift",
    "kt",
    "scala",
    "r",
    "vue",
    "svelte",
    "astro",
    "config",
    "conf",
    "ini",
    "toml",
    "log",
    "gitignore",
    "dockerfile",
    "makefile",
    "readme",
  ];

  const isTextualMimeType = textualTypes.some((type) =>
    file.type.toLowerCase().startsWith(type)
  );

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const isTextualExtension =
    textualExtensions.includes(extension) ||
    file.name.toLowerCase().includes("readme") ||
    file.name.toLowerCase().includes("dockerfile") ||
    file.name.toLowerCase().includes("makefile");

  return isTextualMimeType || isTextualExtension;
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
  return extension.length > 8 ? extension.substring(0, 8) + "..." : extension;
};

// Textual File Preview Card (Light Mode)
const TextualFilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const [isExpanded] = useState(false);
  const previewText = file.textContent?.slice(0, 150) || "";
  const needsTruncation = (file.textContent?.length || 0) > 150;
  const fileExtension = getFileExtension(file.file.name);

  return (
    <div className="bg-[#FAF8F5] border border-[#E2E0D8] relative rounded-xl p-3 size-[125px] shadow-sm shrink-0 overflow-hidden text-left">
      <div className="text-[9.5px] text-[#4A4840] whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
        {file.textContent ? (
          <>
            {isExpanded || !needsTruncation ? file.textContent : previewText}
            {!isExpanded && needsTruncation && "..."}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-[#0E7C5A]" />
          </div>
        )}
      </div>
      <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-[#FFFFFF]/90 from-transparent overflow-hidden">
        <p className="capitalize text-[#1F1E1D] text-[10px] font-mono font-bold bg-white border border-[#E2E0D8] px-1.5 py-0.5 rounded-md shadow-xs">
          {fileExtension}
        </p>
        {file.uploadStatus === "uploading" && (
          <div className="absolute top-2 left-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0E7C5A]" />
          </div>
        )}
        {file.uploadStatus === "error" && (
          <div className="absolute top-2 left-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          </div>
        )}
        <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-200 flex items-center gap-1 absolute top-2 right-2">
          {file.textContent && (
            <button
              type="button"
              className="h-6 w-6 rounded-md bg-white border border-[#E2E0D8] text-[#5A5851] hover:text-[#1F1E1D] hover:bg-gray-50 flex items-center justify-center shadow-xs"
              onClick={() => navigator.clipboard.writeText(file.textContent || "")}
              title="Copier le contenu"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            className="h-6 w-6 rounded-md bg-white border border-[#E2E0D8] text-[#5A5851] hover:text-[#1F1E1D] hover:bg-gray-50 flex items-center justify-center shadow-xs"
            onClick={() => onRemove(file.id)}
            title="Supprimer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// File Preview Card (Light Mode)
const FilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith("image/");
  const isTextual = isTextualFile(file.file);

  if (isTextual) {
    return <TextualFilePreviewCard file={file} onRemove={onRemove} />;
  }

  return (
    <div
      className={cn(
        "relative group bg-[#FAF8F5] border border-[#E2E0D8] rounded-xl size-[125px] shadow-sm shrink-0 overflow-hidden text-left",
        isImage ? "p-0" : "p-3"
      )}
    >
      <div className="flex items-start gap-3 size-[125px] overflow-hidden">
        {isImage && file.preview ? (
          <div className="relative size-full rounded-md overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.preview}
              alt={file.file.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
        {!isImage && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-[#FFFFFF]/90 from-transparent overflow-hidden">
                <p className="capitalize text-[#1F1E1D] text-[10px] font-mono font-bold bg-white border border-[#E2E0D8] px-1.5 py-0.5 rounded-md shadow-xs">
                  {getFileTypeLabel(file.type)}
                </p>
              </div>
              {file.uploadStatus === "uploading" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0E7C5A]" />
              )}
              {file.uploadStatus === "error" && (
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              )}
            </div>

            <p
              className="max-w-[90%] text-xs font-semibold text-[#1F1E1D] truncate"
              title={file.file.name}
            >
              {file.file.name}
            </p>
            <p className="text-[10px] text-[#8A887F] mt-1">
              {formatFileSize(file.file.size)}
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-md bg-white border border-[#E2E0D8] text-[#5A5851] hover:text-[#1F1E1D] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
        onClick={() => onRemove(file.id)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// Pasted Content Card (Light Mode)
const PastedContentCard: React.FC<{
  content: PastedContent;
  onRemove: (id: string) => void;
}> = ({ content, onRemove }) => {
  const [isExpanded] = useState(false);
  const previewText = content.content.slice(0, 150);
  const needsTruncation = content.content.length > 150;

  return (
    <div className="bg-[#FAF8F5] border border-[#E2E0D8] relative rounded-xl p-3 size-[125px] shadow-sm shrink-0 overflow-hidden text-left">
      <div className="text-[9.5px] text-[#4A4840] whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
        {isExpanded || !needsTruncation ? content.content : previewText}
        {!isExpanded && needsTruncation && "..."}
      </div>
      <div className="group absolute flex justify-start items-end p-2 inset-0 bg-gradient-to-b to-[#FFFFFF]/90 from-transparent overflow-hidden">
        <p className="capitalize text-[#1F1E1D] text-[10px] font-mono font-bold bg-white border border-[#E2E0D8] px-1.5 py-0.5 rounded-md shadow-xs">
          COLLÉ
        </p>
        <div className="group-hover:opacity-100 opacity-0 transition-opacity duration-200 flex items-center gap-1 absolute top-2 right-2">
          <button
            type="button"
            className="h-6 w-6 rounded-md bg-white border border-[#E2E0D8] text-[#5A5851] hover:text-[#1F1E1D] flex items-center justify-center shadow-xs"
            onClick={() => navigator.clipboard.writeText(content.content)}
            title="Copier le texte"
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="h-6 w-6 rounded-md bg-white border border-[#E2E0D8] text-[#5A5851] hover:text-[#1F1E1D] flex items-center justify-center shadow-xs"
            onClick={() => onRemove(content.id)}
            title="Supprimer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Model Selector Dropdown (Light Mode)
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
        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.05] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate max-w-[130px] sm:max-w-[170px]">
          {selectedModelData.name}
        </span>
        <ChevronDown
          className={cn(
            "ml-0.5 h-3.5 w-3.5 transition-transform opacity-70",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-[#E2E0D8] rounded-2xl shadow-xl z-30 p-1.5 text-left">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              className={cn(
                "w-full text-left p-2.5 rounded-xl hover:bg-black/[0.04] transition-colors flex items-center justify-between",
                model.id === selectedModel && "bg-[#0E7C5A]/10 text-[#0E7C5A]"
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
                    <span className="px-1.5 py-0.2 text-[9.5px] bg-[#0E7C5A]/15 text-[#0E7C5A] border border-[#0E7C5A]/30 rounded-full font-semibold">
                      {model.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8A887F] mt-0.5 truncate">
                  {model.description}
                </p>
              </div>
              {model.id === selectedModel && (
                <Check className="h-4 w-4 text-[#0E7C5A] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Main ClaudeChatInput (100% Light Mode)
export const ClaudeChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Posez une question sur vos ventes, marges ou établissements...",
  maxFiles = MAX_FILES,
  maxFileSize = MAX_FILE_SIZE,
  acceptedFileTypes,
  models = DEFAULT_MODELS_INTERNAL,
  defaultModel,
  onModelChange,
  className = "",
  value,
  onChange,
}) => {
  const [internalMessage, setInternalMessage] = useState("");
  const isControlled = value !== undefined;
  const message = isControlled ? value : internalMessage;

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
    defaultModel || models[0]?.id || ""
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
                    ? { ...f, textContent: "Erreur lecture fichier" }
                    : f
                )
              );
            });
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileToUpload.id ? { ...f, uploadStatus: "uploading" } : f
          )
        );

        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 30 + 10;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileToUpload.id
                  ? { ...f, uploadStatus: "complete", uploadProgress: 100 }
                  : f
              )
            );
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileToUpload.id
                  ? { ...f, uploadProgress: progress }
                  : f
              )
            );
          }
        }, 120);
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

      const fileItems = Array.from(items).filter(
        (item) => item.kind === "file"
      );
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
    if (files.some((f) => f.uploadStatus === "uploading")) {
      alert("Veuillez attendre la fin des téléversements.");
      return;
    }

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
  const canSend =
    hasContent &&
    !disabled &&
    !files.some((f) => f.uploadStatus === "uploading");

  return (
    <div
      className={cn("relative w-full max-w-3xl mx-auto select-none", className)}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) handleFileSelect(e.dataTransfer.files);
      }}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#0E7C5A]/10 border-2 border-dashed border-[#0E7C5A] rounded-2xl flex flex-col items-center justify-center pointer-events-none">
          <p className="text-sm font-semibold text-[#0E7C5A] flex items-center gap-2">
            <ImageIcon className="size-4" />
            Déposez vos fichiers pour les analyser
          </p>
        </div>
      )}

      {/* Solid Opaque Light Mode Card */}
      <div className="bg-white border border-[#E2E0D8] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] flex flex-col transition-all focus-within:border-[#0E7C5A] focus-within:ring-2 focus-within:ring-[#0E7C5A]/15">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full p-4 bg-transparent text-[#1F1E1D] placeholder:text-[#8A887F] focus:outline-none resize-none text-sm sm:text-base leading-relaxed max-h-48 min-h-[96px]"
          rows={1}
        />

        <div className="flex items-center justify-between w-full px-3 py-2 border-t border-[#F0EFEA]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="h-8 w-8 rounded-lg text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.05] transition-colors flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || files.length >= maxFiles}
              title="Joindre un fichier (menu, facture, export caisse)"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-lg text-[#5A5851] hover:text-[#1F1E1D] hover:bg-black/[0.05] transition-colors flex items-center justify-center"
              disabled={disabled}
              title="Options d'analyse"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
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

            <button
              type="button"
              className={cn(
                "h-8 w-8 rounded-lg transition-all flex items-center justify-center shadow-xs",
                canSend
                  ? "bg-[#0E7C5A] hover:bg-[#0A6348] text-white"
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
              {files.map((file) => (
                <FilePreviewCard
                  key={file.id}
                  file={file}
                  onRemove={removeFile}
                />
              ))}
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
