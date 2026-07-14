"use client";

import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Paperclip } from "lucide-react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";

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
  children,
}: {
  restaurantId: string;
  conversationId: string;
  attachments: PreparedAttachment[];
  onChange: (next: PreparedAttachment[]) => void;
  children?: (open: () => void, loading: boolean) => React.ReactNode;
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

  // Files still uploading or that failed — not yet in `attachments` (which
  // only holds successfully prepared ones with a signed URL).
  const pendingFiles = upload.files.filter((f) => !upload.successes.includes(f.name));

  return (
    <div {...upload.getRootProps()}>
      <input {...upload.getInputProps()} />

      {(attachments.length > 0 || pendingFiles.length > 0) && (
        <AttachmentGroup className="mb-2">
          {attachments.map((a) => (
            <Attachment key={a.path} size="sm" state="done">
              <AttachmentMedia>
                <FileText />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{a.fileName}</AttachmentTitle>
                <AttachmentDescription>{a.mimeType}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  aria-label={`Retirer ${a.fileName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttachment(a.fileName);
                  }}
                >
                  <X />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
          {pendingFiles.map((f) => {
            const hasError = f.errors.length > 0;
            return (
              <Attachment key={f.name} size="sm" state={hasError ? "error" : "uploading"}>
                <AttachmentMedia>
                  <FileText />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{f.name}</AttachmentTitle>
                  <AttachmentDescription>
                    {hasError ? f.errors[0]?.message ?? "Échec du téléversement" : "Envoi en cours…"}
                  </AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            );
          })}
        </AttachmentGroup>
      )}

      {children?.(upload.open, upload.loading)}
    </div>
  );
}
