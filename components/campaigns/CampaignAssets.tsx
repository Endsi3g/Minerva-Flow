"use client";

import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/dropzone";
import { useEffect, useRef } from "react";

export type PreparedCampaignAsset = {
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "file";
};

const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const FILE_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const BUCKET = "campaign-assets";
const MAX_IMAGES = 5;
const MAX_FILES = 2;

function useAutoUpload(
  kind: "image" | "file",
  path: string,
  maxFiles: number,
  maxFileSize: number,
  allowedMimeTypes: string[],
  onAdd: (assets: PreparedCampaignAsset[]) => void
) {
  const upload = useSupabaseUpload({ bucketName: BUCKET, path, allowedMimeTypes, maxFiles, maxFileSize });
  const uploadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pending = upload.files.filter((f) => f.errors.length === 0 && !upload.successes.includes(f.name));
    if (pending.length > 0 && !upload.loading) upload.onUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.files]);

  useEffect(() => {
    const newlyUploaded = upload.files.filter(
      (f) => upload.successes.includes(f.name) && !uploadedRef.current.has(f.name)
    );
    if (newlyUploaded.length === 0) return;
    const prepared: PreparedCampaignAsset[] = newlyUploaded.map((file) => {
      uploadedRef.current.add(file.name);
      return {
        path: `${path}/${file.name}`,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        kind,
      };
    });
    onAdd(prepared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.successes]);

  return upload;
}

export function CampaignAssets({
  restaurantId,
  draftId,
  onAdd,
}: {
  restaurantId: string;
  draftId: string;
  onAdd: (assets: PreparedCampaignAsset[]) => void;
}) {
  const path = `${restaurantId}/${draftId}`;

  const imageUpload = useAutoUpload("image", path, MAX_IMAGES, 8 * 1024 * 1024, IMAGE_MIME_TYPES, onAdd);
  const fileUpload = useAutoUpload("file", path, MAX_FILES, 15 * 1024 * 1024, FILE_MIME_TYPES, onAdd);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-mv-ink-soft">Images (jusqu&apos;à {MAX_IMAGES})</p>
        <Dropzone {...imageUpload}>
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
      </div>

      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-mv-ink-soft">Fichiers (jusqu&apos;à {MAX_FILES})</p>
        <Dropzone {...fileUpload}>
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
      </div>
    </div>
  );
}
