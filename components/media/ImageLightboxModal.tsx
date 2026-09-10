"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

export function ImageLightboxModal({
  imageUrl,
  title,
  isOpen,
  onClose,
}: {
  imageUrl: string | null | undefined;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-mv-ink shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-black/40">
          <div className="flex items-center gap-2 text-mv-cream">
            <ZoomIn size={15} className="text-mv-green" />
            <span className="text-[13px] font-medium truncate">{title ?? "Photo de l'avis"}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-mv-cream/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center justify-center p-2 bg-black/20 overflow-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title ?? "Avis client"}
            className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain shadow-md"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
