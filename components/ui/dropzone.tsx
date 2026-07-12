"use client";

import { CheckCircle, File, Loader2, Upload, X } from "lucide-react";
import { createContext, useCallback, useContext, type PropsWithChildren } from "react";

import { cn } from "@/lib/utils";
import { type UseSupabaseUploadReturn } from "@/hooks/use-supabase-upload";
import { Button } from "@/components/ui/Button";

export const formatBytes = (
  bytes: number,
  decimals = 2,
  size?: "bytes" | "KB" | "MB" | "GB" | "TB" | "PB" | "EB" | "ZB" | "YB"
) => {
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  if (bytes === 0 || bytes === undefined) return size !== undefined ? `0 ${size}` : "0 bytes";
  const i = size !== undefined ? sizes.indexOf(size) : Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

type DropzoneContextType = Omit<UseSupabaseUploadReturn, "getRootProps" | "getInputProps">;

const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined);

type DropzoneProps = UseSupabaseUploadReturn & {
  className?: string;
};

const Dropzone = ({
  className,
  children,
  getRootProps,
  getInputProps,
  ...restProps
}: PropsWithChildren<DropzoneProps>) => {
  const isSuccess = restProps.isSuccess;
  const isActive = restProps.isDragActive;
  const isInvalid =
    (restProps.isDragActive && restProps.isDragReject) ||
    (restProps.errors.length > 0 && !restProps.isSuccess) ||
    restProps.files.some((file) => file.errors.length !== 0);

  return (
    <DropzoneContext.Provider value={{ ...restProps }}>
      <div
        {...getRootProps({
          className: cn(
            "rounded-xl border-2 border-mv-border bg-mv-surface p-6 text-center text-mv-ink transition-colors duration-300",
            className,
            isSuccess ? "border-solid" : "border-dashed",
            isActive && "border-mv-green bg-mv-green-tint",
            isInvalid && "border-mv-red bg-mv-red-bg"
          ),
        })}
      >
        <input {...getInputProps()} />
        {children}
      </div>
    </DropzoneContext.Provider>
  );
};

const DropzoneContent = ({ className }: { className?: string }) => {
  const { files, setFiles, onUpload, loading, successes, errors, maxFileSize, maxFiles, isSuccess } =
    useDropzoneContext();

  const exceedMaxFiles = files.length > maxFiles;

  const handleRemoveFile = useCallback(
    (fileName: string) => {
      setFiles(files.filter((file) => file.name !== fileName));
    },
    [files, setFiles]
  );

  if (isSuccess) {
    return (
      <div className={cn("flex flex-row items-center justify-center gap-x-2", className)}>
        <CheckCircle size={16} className="text-mv-green-dark" />
        <p className="text-[13px] text-mv-green-dark">
          {files.length} fichier{files.length > 1 ? "s" : ""} envoyé{files.length > 1 ? "s" : ""}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {files.map((file, idx) => {
        const fileError = errors.find((e) => e.name === file.name);
        const isSuccessfullyUploaded = !!successes.find((e) => e === file.name);

        return (
          <div
            key={`${file.name}-${idx}`}
            className="flex items-center gap-x-4 border-b border-mv-border-soft py-2 first:mt-4 last:mb-4"
          >
            {file.type.startsWith("image/") ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-mv-border bg-mv-cream-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.preview} alt={file.name} className="object-cover" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-mv-border bg-mv-cream-soft">
                <File size={18} />
              </div>
            )}

            <div className="flex grow shrink flex-col items-start truncate">
              <p title={file.name} className="max-w-full truncate text-[13px]">
                {file.name}
              </p>
              {file.errors.length > 0 ? (
                <p className="text-[11.5px] text-mv-red">
                  {file.errors
                    .map((e) =>
                      e.message.startsWith("File is larger than")
                        ? `Fichier trop volumineux (max ${formatBytes(maxFileSize, 2)})`
                        : e.message
                    )
                    .join(", ")}
                </p>
              ) : loading && !isSuccessfullyUploaded ? (
                <p className="text-[11.5px] text-mv-ink-faint">Envoi…</p>
              ) : fileError ? (
                <p className="text-[11.5px] text-mv-red">Échec : {fileError.message}</p>
              ) : isSuccessfullyUploaded ? (
                <p className="text-[11.5px] text-mv-green-dark">Envoyé</p>
              ) : (
                <p className="text-[11.5px] text-mv-ink-faint">{formatBytes(file.size, 2)}</p>
              )}
            </div>

            {!loading && !isSuccessfullyUploaded && (
              <Button
                size="icon-sm"
                variant="ghost"
                className="shrink-0 justify-self-end"
                onClick={() => handleRemoveFile(file.name)}
              >
                <X size={15} />
              </Button>
            )}
          </div>
        );
      })}
      {exceedMaxFiles && (
        <p className="mt-2 text-left text-[12.5px] text-mv-red">
          Maximum {maxFiles} fichier{maxFiles > 1 ? "s" : ""}, retirez-en {files.length - maxFiles}.
        </p>
      )}
      {files.length > 0 && !exceedMaxFiles && (
        <div className="mt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onUpload}
            disabled={files.some((file) => file.errors.length !== 0) || loading}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Envoi…
              </>
            ) : (
              "Envoyer les fichiers"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

const DropzoneEmptyState = ({ className }: { className?: string }) => {
  const { maxFiles, maxFileSize, inputRef, isSuccess } = useDropzoneContext();

  if (isSuccess) return null;

  return (
    <div className={cn("flex flex-col items-center gap-y-2", className)}>
      <Upload size={20} className="text-mv-ink-faint" />
      <p className="text-[13px] font-semibold text-mv-ink">
        Déposer {!!maxFiles && maxFiles > 1 ? `${maxFiles} ` : "un "}fichier{!maxFiles || maxFiles > 1 ? "s" : ""}
      </p>
      <div className="flex flex-col items-center gap-y-1">
        <p className="text-[12px] text-mv-ink-faint">
          Glissez-déposez ou{" "}
          <a
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer text-mv-green-dark underline transition hover:text-mv-green-darker"
          >
            sélectionnez {maxFiles === 1 ? "un fichier" : "des fichiers"}
          </a>
        </p>
        {maxFileSize !== Number.POSITIVE_INFINITY && (
          <p className="text-[11.5px] text-mv-ink-faint">
            Taille maximale : {formatBytes(maxFileSize, 2)}
          </p>
        )}
      </div>
    </div>
  );
};

const useDropzoneContext = () => {
  const context = useContext(DropzoneContext);
  if (!context) throw new Error("useDropzoneContext must be used within a Dropzone");
  return context;
};

export { Dropzone, DropzoneContent, DropzoneEmptyState, useDropzoneContext };
