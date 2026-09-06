"use client";

import { useEffect, useRef } from "react";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/dropzone";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

const BUCKET = "offer-images"; // already public + restaurant-scoped-by-path, same as offer photos
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_PHOTOS = 8;

/**
 * Multiple photos for the restaurant's own public profile (the native
 * discovery app's RestaurantDetailView carousel) — same
 * useSupabaseUpload/Dropzone pattern as MenuImageUpload, but multi-file
 * and append-to-array instead of single-file replace, since a gallery
 * needs several photos accumulating over time, not one image being
 * swapped.
 */
export function RestaurantGalleryUpload({
  restaurantId,
  imageUrls,
  onChange,
}: {
  restaurantId: string;
  imageUrls: string[];
  onChange: (urls: string[]) => void;
}) {
  const path = `${restaurantId}/gallery`;
  const upload = useSupabaseUpload({
    bucketName: BUCKET,
    path,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxFiles: MAX_PHOTOS,
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
    const supabase = createClient();
    const newUrls: string[] = [];
    for (const file of newlyUploaded) {
      uploadedRef.current.add(file.name);
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${path}/${file.name}`);
      newUrls.push(data.publicUrl);
    }
    onChange([...imageUrls, ...newUrls]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.successes]);

  function handleRemove(url: string) {
    onChange(imageUrls.filter((u) => u !== url));
  }

  return (
    <div className="space-y-2">
      {imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url) => (
            <div key={url} className="group relative h-20 w-20 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                aria-label="Retirer cette photo"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-mv-ink text-white shadow-mv-sm opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      {imageUrls.length < MAX_PHOTOS && (
        <Dropzone {...upload}>
          <DropzoneEmptyState />
          <DropzoneContent />
        </Dropzone>
      )}
    </div>
  );
}
