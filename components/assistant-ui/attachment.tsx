"use client";

import { AttachmentPrimitive } from "@assistant-ui/react";
import { FileText, X } from "lucide-react";

export function AttachmentPreview() {
  return (
    <AttachmentPrimitive.Root className="relative flex items-center gap-2 rounded-xl border border-mv-border bg-mv-surface px-3 py-2 text-xs shadow-mv-sm group">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
        <FileText size={15} />
      </div>
      <div className="flex flex-col min-w-0 pr-4">
        <span className="truncate font-medium text-mv-ink text-[12px]">
          <AttachmentPrimitive.Name />
        </span>
      </div>

      <AttachmentPrimitive.Remove asChild>
        <button
          type="button"
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-soft hover:bg-mv-red-bg hover:text-mv-red transition-colors"
        >
          <X size={12} />
        </button>
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
}

export function UserMessageAttachment() {
  return (
    <AttachmentPrimitive.Root className="flex items-center gap-2 rounded-xl border border-mv-border bg-mv-cream-soft/80 px-3 py-1.5 text-xs">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
        <FileText size={13} />
      </div>
      <span className="truncate font-medium text-mv-ink text-[11.5px]">
        <AttachmentPrimitive.Name />
      </span>
    </AttachmentPrimitive.Root>
  );
}
