"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone, type FileError, type FileRejection } from "react-dropzone";
import { parseTransactionsCsv } from "@/lib/csv-transactions";
import { importTransactionsAction } from "@/app/(app)/finance/actions";

interface FileWithPreview extends File {
  preview?: string;
  errors: readonly FileError[];
}

type UseCsvTransactionImportOptions = {
  maxFiles?: number;
  maxFileSize?: number;
  onImported?: (count: number) => void;
};

/**
 * Same return shape as hooks/use-supabase-upload.ts (so it drops into the
 * existing components/ui/dropzone.tsx primitives unchanged), but instead of
 * uploading the raw file to storage, it parses it as a transactions CSV and
 * inserts the rows as real financial_transactions via a Server Action.
 */
export function useCsvTransactionImport(options: UseCsvTransactionImportOptions = {}) {
  const { maxFiles = 1, maxFileSize = 5 * 1000 * 1000, onImported } = options;

  const [files, setFiles] = useState<FileWithPreview[]>([]);
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
    [files]
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
        const { rows, errors: parseErrors } = parseTransactionsCsv(text);

        if (rows.length === 0) {
          nextErrors.push({
            name: file.name,
            message: parseErrors[0] ?? "Aucune ligne valide trouvée.",
          });
          continue;
        }

        const inserted = await importTransactionsAction(rows);
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

  useEffect(() => {
    if (files.length === 0) {
      setErrors([]);
    }
    if (files.length <= maxFiles) {
      let changed = false;
      const newFiles = files.map((file) => {
        if (file.errors.some((e) => e.code === "too-many-files")) {
          file.errors = file.errors.filter((e) => e.code !== "too-many-files");
          changed = true;
        }
        return file;
      });
      if (changed) setFiles(newFiles);
    }
  }, [files, files.length, maxFiles]);

  return {
    files,
    setFiles,
    successes,
    isSuccess,
    loading,
    errors,
    setErrors,
    onUpload,
    maxFileSize,
    maxFiles,
    allowedMimeTypes: ["text/csv"],
    ...dropzoneProps,
  };
}
