"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@/components/ui/dropzone";
import { usePdfMenuScan, type ScannedMenuItem } from "@/hooks/use-pdf-menu-scan";
import { Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/lib/types";

export function ImportMenuPdfModal({
  restaurantId,
  open,
  onClose,
  onImported,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onImported: (items: MenuItem[]) => void;
}) {
  const [done, setDone] = useState<number | null>(null);
  const scan = usePdfMenuScan({
    restaurantId,
    onImported: (items) => {
      setDone(items.length);
      onImported(items);
    },
  });

  const grouped = useMemo(() => {
    const byCategory = new Map<string, ScannedMenuItem[]>();
    for (const item of scan.items) {
      const key = item.category?.trim() || "Sans catégorie";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(item);
    }
    return Array.from(byCategory.entries());
  }, [scan.items]);

  const includedCount = scan.items.filter((i) => i.include).length;

  function updateItem(key: string, patch: Partial<ScannedMenuItem>) {
    scan.setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    scan.setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function handleClose() {
    scan.reset();
    setDone(null);
    onClose();
  }

  async function handleConfirm() {
    await scan.confirmImport();
  }

  const showReview = scan.items.length > 0 && done === null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importer un menu (PDF)"
      description={
        done !== null
          ? undefined
          : showReview
            ? "Vérifiez et corrigez les plats détectés avant l'import — rien n'est encore ajouté à votre menu."
            : "L'IA lit votre PDF et propose une liste de plats, prix et catégories à valider."
      }
      width={showReview ? 640 : 480}
    >
      <div className="space-y-4">
        {done !== null ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 size={28} className="text-mv-green-dark" />
            <p className="text-[13.5px] font-semibold text-mv-ink">
              {done} plat{done > 1 ? "s" : ""} importé{done > 1 ? "s" : ""}
            </p>
            <p className="text-[12px] text-mv-ink-faint">Modifiez prix, food cost ou photo directement depuis le menu.</p>
          </div>
        ) : showReview ? (
          <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
            <p className="text-[12.5px] text-mv-ink-soft">
              {scan.items.length} plat{scan.items.length > 1 ? "s" : ""} détecté{scan.items.length > 1 ? "s" : ""} —{" "}
              <span className="font-semibold text-mv-ink">{includedCount} sélectionné{includedCount > 1 ? "s" : ""}</span>
            </p>
            {grouped.map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">{category}</p>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.key}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-mv-border-soft bg-mv-surface p-2",
                        !item.include && "opacity-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={item.include}
                        onChange={(e) => updateItem(item.key, { include: e.target.checked })}
                        className="size-4 shrink-0 accent-mv-green"
                        aria-label={`Inclure ${item.name}`}
                      />
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(item.key, { name: e.target.value })}
                        placeholder="Nom du plat"
                        className="h-8 min-w-0 flex-1 rounded-md border border-mv-border bg-mv-cream-soft px-2 text-[12.5px] text-mv-ink focus:border-mv-green focus:outline-none"
                      />
                      <div className="flex shrink-0 items-center gap-1 text-[12.5px] text-mv-ink-soft">
                        <span>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.05"
                          value={item.price}
                          onChange={(e) => updateItem(item.key, { price: Number(e.target.value) })}
                          className="h-8 w-16 rounded-md border border-mv-border bg-mv-cream-soft px-1.5 text-[12.5px] text-mv-ink focus:border-mv-green focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        aria-label={`Retirer ${item.name}`}
                        className="shrink-0 rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-red-bg hover:text-mv-red"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Dropzone {...scan}>
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>
        )}

        {!showReview && done === null && scan.files.length > 0 && !scan.loading && (
          <Button className="w-full" onClick={scan.onUpload}>
            Analyser le PDF
          </Button>
        )}
        {scan.loading && (
          <p className="text-center text-[12.5px] text-mv-ink-faint">Analyse du menu en cours…</p>
        )}

        <div className="flex items-center justify-between border-t border-mv-border-soft pt-4">
          {showReview ? (
            <button
              type="button"
              onClick={scan.reset}
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-mv-ink-soft hover:text-mv-ink"
            >
              <RotateCcw size={13} /> Recommencer
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              {done !== null ? "Fermer" : "Annuler"}
            </Button>
            {showReview && (
              <Button type="button" onClick={handleConfirm} disabled={includedCount === 0 || scan.importing}>
                {scan.importing ? "Import…" : `Importer ${includedCount} plat${includedCount > 1 ? "s" : ""}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
