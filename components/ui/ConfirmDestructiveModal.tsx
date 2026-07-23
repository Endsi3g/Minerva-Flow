"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";

export function ConfirmDestructiveModal({
  open,
  onOpenChange,
  title,
  itemName,
  description,
  actionLabel = "Supprimer définitivement",
  onConfirm,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  itemName?: string;
  description?: string;
  actionLabel?: string;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    try {
      setLoading(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md bg-mv-surface border border-mv-border shadow-mv-xl rounded-2xl p-6">
        <AlertDialogHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mv-red-tint text-mv-red border border-mv-red/20 shrink-0">
            <AlertTriangle size={22} />
          </div>
          <AlertDialogTitle className="font-heading text-[19px] font-normal text-mv-ink">
            {title || `Confirmer la suppression de ${itemName ? `"${itemName}"` : "cet élément"}`}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[13.5px] text-mv-ink-soft leading-relaxed font-normal">
            {description || (
              <>
                Cette action est irréversible. L&apos;élément <strong className="text-mv-ink font-normal">{itemName}</strong> sera retiré définitivement du système.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
          <AlertDialogCancel
            disabled={loading || isPending}
            className="rounded-xl border border-mv-border bg-mv-cream hover:bg-mv-cream-soft font-normal text-[13px] text-mv-ink"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading || isPending}
            onClick={handleConfirm}
            className="rounded-xl bg-mv-red hover:bg-mv-red-dark text-white font-normal text-[13px] gap-2 shadow-mv-sm"
          >
            <Trash2 size={15} />
            {loading || isPending ? "Suppression..." : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
