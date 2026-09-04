"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PLANS } from "@/lib/billing/plans";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Upsell prompt shown instead of the "add establishment" form when a
 * Starter workspace is already at its 1-establishment limit — see
 * checkCanAddEstablishmentAction() and PLAN_ESTABLISHMENT_LIMITS.
 */
export function EstablishmentLimitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pro = PLANS.pro;
  const router = useRouter();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Passez à Flow Pro pour ajouter un établissement"
      description="Le forfait Starter est limité à 1 établissement."
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-mv-green-tint/40 border border-mv-green/20 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-mv-ink">Flow {pro.name} — établissements illimités</p>
            <p className="mt-0.5 text-[12.5px] text-mv-ink-soft">
              {pro.monthlyPriceCad}$ CAD/mois — gérez tous vos établissements depuis un seul workspace.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {pro.features.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0 text-mv-green-dark" />
              <span className="text-[12.5px] text-mv-ink-soft">{feature}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Plus tard
          </Button>
          <Button className="flex-1" onClick={() => router.push("/billing")}>
            Voir les forfaits
          </Button>
        </div>
      </div>
    </Modal>
  );
}
