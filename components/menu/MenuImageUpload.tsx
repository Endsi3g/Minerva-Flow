"use client";

import { useEffect, useRef } from "react";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/dropzone";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_BUCKET = "menu-item-images";
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Single-image dropzone for a menu item (or, via the `bucket` prop, any
 * other restaurant-scoped public image like an offer) — patron identique à
 * components/campaigns/CampaignAssets.tsx (useSupabaseUpload + Dropzone
 * générique), mais un seul fichier auto-upload directement vers une URL
 * publique (bucket public, comme "avatars") au lieu d'une table
 * d'instantanés privée comme campaign_assets.
 */
export function MenuImageUpload({
  restaurantId,
  scopeId,
  currentUrl,
  onUploaded,
  bucket = DEFAULT_BUCKET,
}: {
  restaurantId: string;
  scopeId: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  bucket?: string;
}) {
  const path = `${restaurantId}/${scopeId}`;
  const upload = useSupabaseUpload({
    bucketName: bucket,
    path,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxFiles: 1,
    maxFileSize: MAX_SIZE,
  });
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
    const file = newlyUploaded[0];
    uploadedRef.current.add(file.name);
    const supabase = createClient();
    const { data } = supabase.storage.from(bucket).getPublicUrl(`${path}/${file.name}`);
    onUploaded(data.publicUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.successes]);

  return (
    <div>
      {currentUrl && upload.files.length === 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="" className="mb-2 h-20 w-20 rounded-lg object-cover" />
      )}
      <Dropzone {...upload}>
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>
    </div>
  );
}
