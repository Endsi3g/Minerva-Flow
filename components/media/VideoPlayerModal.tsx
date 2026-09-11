"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Play, AlertCircle } from "lucide-react";

function getEmbedUrl(url: string): { type: "youtube" | "vimeo" | "native"; embedUrl: string } {
  const trimmed = url.trim();

  // YouTube
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
    };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`,
    };
  }

  return { type: "native", embedUrl: trimmed };
}

export function VideoPlayerModal({
  videoUrl,
  title,
  isOpen,
  open,
  onClose,
}: {
  videoUrl: string | null | undefined;
  title?: string;
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const visible = open ?? isOpen ?? false;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  if (!visible || !videoUrl || !mounted) return null;

  const { type, embedUrl } = getEmbedUrl(videoUrl);

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-mv-ink/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-xl">
        {/* Header in luxury editorial light mode */}
        <div className="flex items-center justify-between border-b border-mv-border-soft px-4 py-3 bg-mv-cream-soft/80">
          <div className="flex items-center gap-2 text-mv-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
              <Play size={11} className="fill-current ml-0.5" />
            </span>
            <span className="font-display text-[14.5px] font-medium truncate">{title ?? "Aperçu vidéo"}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-ink transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Video Surface */}
        <div className="relative aspect-video w-full bg-[#0d100c] flex items-center justify-center">
          {type === "youtube" || type === "vimeo" ? (
            <iframe
              src={embedUrl}
              title={title ?? "Vidéo"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          ) : (
            <video
              src={embedUrl}
              controls
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            >
              Votre navigateur ne supporte pas la lecture de cette vidéo.
            </video>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
