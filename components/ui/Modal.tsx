"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-mv-ink/40 backdrop-blur-[2px] mv-animate-in"
        onClick={onClose}
      />
      <div
        style={{ maxWidth: width }}
        className="mv-animate-in relative w-full rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-lg"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[19px] font-medium text-mv-ink">{title}</h2>
            {description && (
              <p className="mt-1 text-[13px] text-mv-ink-soft">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mv-ink-soft transition-colors hover:bg-mv-ink/5"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
