"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/dropzone";
import { useCsvServiceDaysImport } from "@/hooks/use-csv-service-days-import";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function ImportServiceDaysModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const [importedCount, setImportedCount] = useState(0);
  const upload = useCsvServiceDaysImport({
    maxFiles: 1,
    onImported: (count) => {
      setImportedCount(count);
      onImported(count);
    },
  });

  function handleClose() {
    upload.setFiles([]);
    setImportedCount(0);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importer un historique"
      description="Un fichier CSV avec au minimum les colonnes « Date » et « Revenu » — les autres colonnes (Dépenses, Source, Notes) sont optionnelles."
      width={520}
    >
      <div className="space-y-4">
        {upload.isSuccess ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 size={28} className="text-mv-green-dark" />
            <p className="text-[13.5px] font-semibold text-mv-ink">
              {importedCount} journée{importedCount > 1 ? "s" : ""} importée{importedCount > 1 ? "s" : ""}
            </p>
            <p className="text-[12px] text-mv-ink-faint">
              Une date déjà présente est écrasée par la nouvelle valeur importée.
            </p>
          </div>
        ) : (
          <Dropzone {...upload}>
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>
        )}

        {!upload.isSuccess && upload.files.length > 0 && !upload.loading && (
          <Button className="w-full" onClick={upload.onUpload}>
            Importer
          </Button>
        )}

        <div className="flex justify-end border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            {upload.isSuccess ? "Fermer" : "Annuler"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
