"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone, type FileError, type FileRejection } from "react-dropzone";
import { normalizeFileCount } from "@/hooks/normalize-file-count";
import { parseServiceDaysCsv } from "@/lib/csv-service-days";
import { importServiceDaysAction } from "@/app/[locale]/(app)/days/actions";

interface FileWithPreview extends File {
  preview?: string;
  errors: readonly FileError[];
}

type UseCsvServiceDaysImportOptions = {
  maxFiles?: number;
  maxFileSize?: number;
  onImported?: (count: number) => void;
};

/**
 * Same shape/pattern as use-csv-transaction-import.ts, for the historical
 * revenue import on /days — parses a CSV of past service days and bulk
 * upserts them via a Server Action instead of uploading the raw file.
 */
export function useCsvServiceDaysImport(options: UseCsvServiceDaysImportOptions = {}) {
  const { maxFiles = 1, maxFileSize = 5 * 1000 * 1000, onImported } = options;

  const [rawFiles, setFiles] = useState<FileWithPreview[]>([]);
  const files = useMemo(() => normalizeFileCount(rawFiles, maxFiles), [rawFiles, maxFiles]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  const [successes, setSuccesses] = useState<string[]>([]);

  const isSuccess = useMemo(() => {
    if (errors.length === 0 && successes.length === 0) return false;
    if (errors.length === 0 && successes.length === files.length) return true;
    return false;
  }, [errors.length, successes.length, files.length]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const validFiles = acceptedFiles
        .filter((file) => !files.find((x) => x.name === file.name))
        .map((file) => {
          (file as FileWithPreview).preview = URL.createObjectURL(file);
          (file as FileWithPreview).errors = [];
          return file as FileWithPreview;
        });

      const invalidFiles = fileRejections.map(({ file, errors: fileErrors }) => {
        (file as FileWithPreview).preview = URL.createObjectURL(file);
        (file as FileWithPreview).errors = fileErrors;
        return file as FileWithPreview;
      });

      setFiles([...files, ...validFiles, ...invalidFiles]);
    },
    [files, setFiles]
  );

  const dropzoneProps = useDropzone({
    onDrop,
    noClick: true,
    accept: { "text/csv": [], "application/vnd.ms-excel": [] },
    maxSize: maxFileSize,
    maxFiles,
    multiple: maxFiles !== 1,
  });

  const onUpload = useCallback(async () => {
    setLoading(true);

    const filesToImport = files.filter(
      (f) => !successes.includes(f.name) && f.errors.length === 0
    );
    const nextErrors: { name: string; message: string }[] = [];
    const nextSuccesses: string[] = [];

    for (const file of filesToImport) {
      try {
        const text = await file.text();
        const { rows, errors: parseErrors } = parseServiceDaysCsv(text);

        if (rows.length === 0) {
          nextErrors.push({
            name: file.name,
            message: parseErrors[0] ?? "Aucune ligne valide trouvée.",
          });
          continue;
        }

        const inserted = await importServiceDaysAction(rows);
        if (inserted === 0) {
          nextErrors.push({ name: file.name, message: "Échec de l'import." });
        } else {
          nextSuccesses.push(file.name);
          onImported?.(inserted);
        }
      } catch {
        nextErrors.push({ name: file.name, message: "Fichier illisible." });
      }
    }

    setErrors(nextErrors);
    setSuccesses((prev) => Array.from(new Set([...prev, ...nextSuccesses])));
    setLoading(false);
  }, [files, successes, onImported]);


  return {
    files,
    setFiles,
    successes,
    isSuccess,
    loading,
    errors: files.length === 0 ? [] : errors,
    setErrors,
    onUpload,
    maxFileSize,
    maxFiles,
    allowedMimeTypes: ["text/csv"],
    ...dropzoneProps,
  };
}
