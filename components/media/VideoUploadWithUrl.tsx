"use client";

import { useEffect, useRef, useState } from "react";
import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/dropzone";
import { createClient } from "@/lib/supabase/client";
import { VideoPlayerModal } from "./VideoPlayerModal";
import { Video, Link as LinkIcon, Upload, Trash2, Play, Loader2 } from "lucide-react";

const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/ogg"];
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

export function VideoUploadWithUrl({
  restaurantId,
  scopeId,
  currentUrl,
  value,
  onVideoChanged,
  onChange,
  bucket = "menu-item-images",
  title = "Vidéo du plat",
}: {
  restaurantId: string;
  scopeId: string;
  currentUrl?: string | null;
  value?: string | null;
  onVideoChanged?: (url: string | null) => void;
  onChange?: (url: string | null) => void;
  bucket?: string;
  title?: string;
}) {
  const effectivePropUrl = value !== undefined ? value : currentUrl;
  const [videoUrl, setVideoUrl] = useState<string>(effectivePropUrl ?? "");
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(effectivePropUrl ?? "");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const notifyChange = (url: string | null) => {
    onVideoChanged?.(url);
    onChange?.(url);
  };

  const path = `${restaurantId}/videos/${scopeId}`;
  const upload = useSupabaseUpload({
    bucketName: bucket,
    path,
    allowedMimeTypes: VIDEO_MIME_TYPES,
    maxFiles: 1,
    maxFileSize: MAX_VIDEO_SIZE,
  });
  const uploadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (effectivePropUrl !== undefined) {
      setVideoUrl(effectivePropUrl ?? "");
      setUrlInput(effectivePropUrl ?? "");
    }
  }, [effectivePropUrl]);

  // Handle upload auto-start
  useEffect(() => {
    const pending = upload.files.filter((f) => f.errors.length === 0 && !upload.successes.includes(f.name));
    if (pending.length > 0 && !upload.loading) upload.onUpload();
  }, [upload.files, upload.loading, upload.onUpload, upload.successes]);

  // Handle upload completion
  useEffect(() => {
    const newlyUploaded = upload.files.filter(
      (f) => upload.successes.includes(f.name) && !uploadedRef.current.has(f.name)
    );
    if (newlyUploaded.length === 0) return;

    for (const file of newlyUploaded) {
      uploadedRef.current.add(file.name);
      const supabase = createClient();
      const filePath = `${path}/${file.name}`;
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      setVideoUrl(publicUrl);
      setUrlInput(publicUrl);
      notifyChange(publicUrl);
    }
  }, [upload.successes, upload.files, path, bucket]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (trimmed) {
      setVideoUrl(trimmed);
      notifyChange(trimmed);
    }
  };

  const handleRemove = () => {
    setVideoUrl("");
    setUrlInput("");
    upload.setFiles([]);
    notifyChange(null);
  };

  return (
    <div className="space-y-3 rounded-xl border border-mv-border bg-mv-cream-soft/50 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video size={16} className="text-mv-green" />
          <span className="text-[13px] font-semibold text-mv-ink">Contenu Vidéo (Optionnel)</span>
        </div>
        {videoUrl && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-1 text-[12px] font-medium text-mv-green hover:underline"
            >
              <Play size={12} className="fill-current" />
              Tester la vidéo
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 text-[12px] font-medium text-mv-red hover:underline ml-2"
            >
              <Trash2 size={12} />
              Supprimer
            </button>
          </div>
        )}
      </div>

      {videoUrl ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-mv-green/30 bg-mv-green-tint px-3 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mv-green text-white">
              <Play size={14} className="fill-current" />
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-mv-ink truncate">Vidéo configurée</p>
              <p className="text-[11px] text-mv-ink-faint truncate max-w-sm sm:max-w-md">{videoUrl}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="rounded-md bg-mv-green px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-mv-green-dark transition-colors shrink-0"
          >
            Visionner
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Tabs */}
          <div className="flex rounded-lg border border-mv-border bg-mv-surface p-0.5 max-w-fit">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-semibold transition-all ${
                mode === "upload"
                  ? "bg-mv-green text-mv-cream shadow-sm"
                  : "text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              <Upload size={13} />
              Upload de fichier (MP4, WebM)
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-semibold transition-all ${
                mode === "url"
                  ? "bg-mv-green text-mv-cream shadow-sm"
                  : "text-mv-ink-soft hover:text-mv-ink"
              }`}
            >
              <LinkIcon size={13} />
              Lien externe (YouTube / Vimeo / Direct)
            </button>
          </div>

          {mode === "upload" ? (
            <div className="relative">
              <Dropzone {...upload} className="border-dashed border-mv-border hover:border-mv-green/60 p-4">
                <DropzoneEmptyState className="py-2" />
                <DropzoneContent />
              </Dropzone>
              {upload.loading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-mv-surface/80 backdrop-blur-xs">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-mv-ink">
                    <Loader2 size={16} className="animate-spin text-mv-green" />
                    Téléversement de la vidéo en cours…
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=... ou lien direct .mp4"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 rounded-lg border border-mv-border bg-mv-surface px-3 py-1.5 text-[12.5px] text-mv-ink focus:border-mv-green focus:outline-none"
              />
              <button
                type="submit"
                disabled={!urlInput.trim()}
                className="rounded-lg bg-mv-ink px-3.5 py-1.5 text-[12.5px] font-semibold text-mv-cream hover:bg-mv-ink/90 transition-colors disabled:opacity-50 shrink-0"
              >
                Enregistrer le lien
              </button>
            </form>
          )}
        </div>
      )}

      <VideoPlayerModal
        videoUrl={videoUrl}
        title={title}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
