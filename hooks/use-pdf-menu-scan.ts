"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileError, type FileRejection } from "react-dropzone";
import { createMenuItemsAction } from "@/app/[locale]/(app)/menu/actions";
import type { MenuItemInput } from "@/lib/data/menu";
import type { MenuItem } from "@/lib/types";

interface FileWithPreview extends File {
  preview?: string;
  errors: readonly FileError[];
}

export type ScannedMenuItem = MenuItemInput & { include: boolean; key: string };

/**
 * Same Dropzone-compatible shape as use-csv-service-days-import.ts, but the
 * "upload" step scans the PDF via /api/ai/menu-scan instead of writing
 * anything — extracted items land in review state here, and nothing
 * touches the real menu until confirmImport() is called with the
 * (possibly edited) items from the review screen.
 */
export function usePdfMenuScan({
  restaurantId,
  onImported,
}: {
  restaurantId: string;
  onImported?: (items: MenuItem[]) => void;
}) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [items, setItems] = useState<ScannedMenuItem[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    const validFiles = acceptedFiles.map((file) => {
      (file as FileWithPreview).errors = [];
      return file as FileWithPreview;
    });
    const invalidFiles = fileRejections.map(({ file, errors: fileErrors }) => {
      (file as FileWithPreview).errors = fileErrors;
      return file as FileWithPreview;
    });
    setFiles([...validFiles, ...invalidFiles]);
    setErrors([]);
    setItems([]);
  }, []);

  const dropzoneProps = useDropzone({
    onDrop,
    noClick: true,
    accept: { "application/pdf": [] },
    maxSize: 8 * 1000 * 1000,
    maxFiles: 1,
    multiple: false,
  });

  const onUpload = useCallback(async () => {
    const file = files.find((f) => f.errors.length === 0);
    if (!file) return;
    setLoading(true);
    setErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ai/menu-scan", { method: "POST", body: formData });
      const data = (await res.json()) as {
        items?: { name: string; category: string | null; price: number; description: string | null }[];
        error?: string;
      };
      if (!res.ok || data.error || !data.items) {
        setErrors([{ name: file.name, message: data.error ?? "L'analyse a échoué." }]);
        return;
      }
      setItems(
        data.items.map((item, i) => ({
          name: item.name,
          category: item.category,
          price: item.price,
          foodCost: 0,
          description: item.description,
          include: true,
          key: `${i}-${item.name}`,
        }))
      );
    } catch {
      setErrors([{ name: file.name, message: "L'analyse a échoué. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  }, [files]);

  const confirmImport = useCallback(async () => {
    const toImport = items.filter((i) => i.include && i.name.trim().length > 0);
    if (toImport.length === 0) return [];
    setImporting(true);
    try {
      const created = await createMenuItemsAction(
        restaurantId,
        toImport.map(({ include: _include, key: _key, ...rest }) => rest)
      );
      onImported?.(created);
      return created;
    } finally {
      setImporting(false);
    }
  }, [items, restaurantId, onImported]);

  const reset = useCallback(() => {
    setFiles([]);
    setItems([]);
    setErrors([]);
  }, []);

  return {
    files,
    setFiles,
    successes: [] as string[],
    isSuccess: false,
    loading,
    importing,
    errors,
    setErrors,
    onUpload,
    items,
    setItems,
    confirmImport,
    reset,
    maxFileSize: 8 * 1000 * 1000,
    maxFiles: 1,
    allowedMimeTypes: ["application/pdf"],
    ...dropzoneProps,
  };
}
