"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfileAvatarAction } from "@/app/[locale]/(app)/profil/actions";

const supabase = createClient();

type UseAvatarUploadOptions = {
  userId: string;
  maxFileSize?: number;
  onUploaded?: (avatarUrl: string) => void;
};

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Single-photo variant of hooks/use-supabase-upload.ts, built for the
 * click-to-change avatar on /profil rather than the CSV drag-and-drop
 * flow — one call validates, uploads, and persists the URL, so the caller
 * just wires a hidden <input type="file"> to pickAndUpload().
 *
 * The object key is normalized to avatar.<ext> at {auth.uid()}/avatar.<ext>
 * with upsert so re-uploading always replaces the previous photo (matches
 * the storage.objects "avatars_owner_*" RLS policies, which key off the
 * first path segment being auth.uid()). The resulting public URL is
 * persisted to profiles.avatar_url via updateProfileAvatarAction.
 */
export function useAvatarUpload({
  userId,
  maxFileSize = 3 * 1000 * 1000,
  onUploaded,
}: UseAvatarUploadOptions) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError("Formats acceptés : PNG, JPEG, WEBP, GIF.");
        return;
      }
      if (file.size > maxFileSize) {
        setError(`Fichier trop volumineux (max ${Math.round(maxFileSize / 1_000_000)} Mo).`);
        return;
      }

      setPreview(URL.createObjectURL(file));
      setLoading(true);

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type || undefined });

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // cache-bust: upsert keeps the same object key, so browsers/CDN would
      // otherwise keep serving the previous photo at that URL
      const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

      const result = await updateProfileAvatarAction(avatarUrl);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setLoading(false);
      onUploaded?.(avatarUrl);
    },
    [userId, maxFileSize, onUploaded]
  );

  return { preview, loading, error, pickAndUpload };
}
