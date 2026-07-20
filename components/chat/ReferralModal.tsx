"use client";

import { Modal } from "@/components/ui/Modal";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { getReferralModalDataAction } from "@/app/(chat)/assistant/referral-actions";

type ReferralModalData = {
  code: string | null;
  pendingCount: number;
  activeCount: number;
  freeMonthsApplied: number;
};

export function ReferralModal({
  open,
  onClose,
  restaurantId,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
}) {
  const [data, setData] = useState<ReferralModalData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(null);
    getReferralModalDataAction(restaurantId).then(setData);
  }, [open, restaurantId]);

  const link = data?.code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/sign-up?ref=${data.code}`
    : null;

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Parrainez d'autres restaurants"
      description="Partagez Flow par Minerva et obtenez un mois gratuit sur votre abonnement pour chaque restaurant référé qui devient actif."
    >
      {!data ? (
        <p className="text-[13px] text-mv-ink-faint">Chargement…</p>
      ) : !data.code ? (
        <p className="text-[13px] text-mv-ink-soft">
          Seul un propriétaire ou un gérant peut générer le lien de parrainage pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              Votre lien de parrainage
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-mv-border bg-mv-cream-soft px-3 py-2.5">
              <span className="flex-1 truncate text-[13px] text-mv-ink">{link}</span>
              <button
                onClick={copyLink}
                aria-label="Copier le lien"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
              >
                {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-mv-cream-soft p-2.5 text-center">
              <p className="font-display text-[17px] font-medium text-mv-ink">{data.pendingCount}</p>
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">En attente</p>
            </div>
            <div className="rounded-lg bg-mv-cream-soft p-2.5 text-center">
              <p className="font-display text-[17px] font-medium text-mv-ink">{data.activeCount}</p>
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">Actifs</p>
            </div>
            <div className="rounded-lg bg-mv-cream-soft p-2.5 text-center">
              <p className="font-display text-[17px] font-medium text-mv-ink">
                {data.freeMonthsApplied}
              </p>
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">Mois gratuits</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
