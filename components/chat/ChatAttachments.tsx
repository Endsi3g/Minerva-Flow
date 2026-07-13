"use client";

import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type PreparedAttachment = {
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  signedUrl: string;
};

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const BUCKET = "chat-attachments";

export function ChatAttachments({
  restaurantId,
  conversationId,
  attachments,
  onChange,
}: {
  restaurantId: string;
  conversationId: string;
  attachments: PreparedAttachment[];
  onChange: (next: PreparedAttachment[]) => void;
}) {
  const [sessionId] = useState(() => crypto.randomUUID());
  const path = `${restaurantId}/${conversationId}/${sessionId}`;
  const upload = useSupabaseUpload({
    bucketName: BUCKET,
    path,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxFiles: 5,
    maxFileSize: 20 * 1024 * 1024,
  });
  const uploadedRef = useRef<Set<string>>(new Set());

  // Auto-upload as soon as valid files are dropped/picked — a chat input
  // doesn't need a separate confirm step the way the Finance dropzone does.
  useEffect(() => {
    const pending = upload.files.filter((f) => f.errors.length === 0 && !upload.successes.includes(f.name));
    if (pending.length > 0 && !upload.loading) {
      upload.onUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.files]);

  useEffect(() => {
    const newlyUploaded = upload.files.filter(
      (f) => upload.successes.includes(f.name) && !uploadedRef.current.has(f.name)
    );
    if (newlyUploaded.length === 0) return;

    (async () => {
      const supabase = createClient();
      const prepared: PreparedAttachment[] = [];
      for (const file of newlyUploaded) {
        uploadedRef.current.add(file.name);
        const storagePath = `${path}/${file.name}`;
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
        if (!data?.signedUrl) continue;
        prepared.push({
          path: storagePath,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          signedUrl: data.signedUrl,
        });
      }
      if (prepared.length > 0) onChange([...attachments, ...prepared]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.successes]);

  function removeAttachment(fileName: string) {
    onChange(attachments.filter((a) => a.fileName !== fileName));
  }

  return (
    <div {...upload.getRootProps()}>
      <input {...upload.getInputProps()} />

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((a) => (
            <div
              key={a.path}
              className="flex items-center gap-1.5 rounded-lg border border-mv-border bg-mv-surface px-2.5 py-1.5 text-[12px] text-mv-ink-soft"
            >
              <FileText size={13} className="shrink-0 text-mv-ink-faint" />
              <span className="max-w-[140px] truncate">{a.fileName}</span>
              <button
                type="button"
                onClick={() => removeAttachment(a.fileName)}
                aria-label={`Retirer ${a.fileName}`}
                className="text-mv-ink-faint hover:text-mv-ink"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={upload.open}
        disabled={upload.loading}
        aria-label="Joindre un fichier"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink",
          upload.loading && "pointer-events-none opacity-50"
        )}
      >
        {upload.loading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
      </button>
    </div>
  );
}
