"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { HelperTooltip } from "@/components/ui/HelperTooltip";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import { ReferralRoiDashboard } from "@/components/fidelisation/ReferralRoiDashboard";
import { ReferralActivityHeatmap } from "@/components/fidelisation/ReferralActivityHeatmap";
import type { LoyaltyReward, ReferralProgram } from "@/lib/types";
import type { ReferralLinkTracking } from "@/lib/data/customer-referrals";
import type { ReferralRoiMetrics, TopAmbassador, ReferralDailyActivity } from "@/lib/data/referral-roi";
import { Plus, Trash2, Link2, MousePointerClick, Copy, Check, ExternalLink } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  createReferralProgramAction,
  updateReferralProgramActiveAction,
  deleteReferralProgramAction,
} from "../actions";
import { notifyError } from "@/lib/notify-error";

function NewReferralProgramModal({
  restaurantId,
  rewards,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  rewards: LoyaltyReward[];
  open: boolean;
  onClose: () => void;
  onCreated: (program: ReferralProgram) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const program = await createReferralProgramAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? "") || null,
        goalCount: Number(form.get("goalCount") ?? 1),
        rewardId: String(form.get("rewardId") ?? "") || null,
        rewardDescription: String(form.get("rewardDescription") ?? "") || null,
        referrerBonusPoints: Number(form.get("referrerBonusPoints") ?? 0),
        newCustomerBonusPoints: Number(form.get("newCustomerBonusPoints") ?? 0),
      });
      if (program) {
        onCreated(program);
        onClose();
        (e.target as HTMLFormElement).reset();
      } else {
        notifyError("La création du programme a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau programme de parrainage"
      description="Vos clients partagent un lien ; une fois l'objectif atteint, ils débloquent la récompense."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom">
          <Input name="name" placeholder="Ex : Amenez un ami" required autoFocus />
        </Field>
        <Field label="Description" hint="Optionnel">
          <Input name="description" placeholder="Ex : valable jusqu'à la fin de l'été" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Objectif" hint="Nombre de parrainages réussis requis">
            <Input name="goalCount" type="number" min="1" step="1" defaultValue="1" required />
          </Field>
          <Field label="Récompense du catalogue" hint="Optionnel">
            <Select name="rewardId" defaultValue="">
              <option value="">—</option>
              {rewards.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Ou décrivez la récompense librement" hint="Optionnel — affiché au client">
          <Input name="rewardDescription" placeholder="Ex : dessert offert" />
        </Field>
        <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 p-3">
          <p className="mb-2 text-[12px] font-semibold text-mv-ink">Bonus immédiat à la conversion</p>
          <p className="mb-3 text-[11.5px] leading-snug text-mv-ink-faint">
            Crédité en points dès qu&apos;un ami parrainé devient client — en plus de la récompense d&apos;objectif ci-dessus, qui reste remise à la main.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pour le parrain" hint="Points">
              <Input name="referrerBonusPoints" type="number" min="0" step="1" defaultValue="0" />
            </Field>
            <Field label="Pour le nouveau client" hint="Points">
              <Input name="newCustomerBonusPoints" type="number" min="0" step="1" defaultValue="0" />
            </Field>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReferralLinkRow({ tracking }: { tracking: ReferralLinkTracking }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${tracking.link.code}`;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-mv-cream-soft px-3 py-2 text-[12.5px]">
      <div className="min-w-0">
        <span className="font-medium text-mv-ink">{tracking.customerName}</span>
        <span className="text-mv-ink-faint"> — {tracking.programName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-mv-ink-soft">
        <HelperTooltip content="Nombre de fois où quelqu'un a cliqué sur ce lien de parrainage.">
          <span className="flex items-center gap-1 cursor-help">
            <MousePointerClick size={12} /> {tracking.link.clicks}
          </span>
        </HelperTooltip>
        <HelperTooltip content="Nombre de filleuls qui sont devenus clients grâce à ce lien.">
          <span className="flex items-center gap-1 cursor-help">
            <Link2 size={12} /> {tracking.link.convertedCount}
          </span>
        </HelperTooltip>
        {tracking.link.rewardClaimedAt && <Badge tone="green">Débloquée</Badge>}
        <button
          onClick={() => window.open(url, "_blank")}
          aria-label="Ouvrir le lien de parrainage"
          title="Ouvrir le lien"
          className="text-mv-ink-faint transition-colors hover:text-mv-ink"
        >
          <ExternalLink size={13} />
        </button>
        <button
          onClick={handleCopy}
          aria-label="Copier le lien de parrainage"
          title="Copier le lien de parrainage"
          className="text-mv-ink-faint transition-colors hover:text-mv-ink"
        >
          {copied ? <Check size={13} className="text-mv-green-dark" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

function ReferralProgramsCard({
  restaurantId,
  programs,
  rewards,
  links,
  onChange,
}: {
  restaurantId: string;
  programs: ReferralProgram[];
  rewards: LoyaltyReward[];
  links: ReferralLinkTracking[];
  onChange: (programs: ReferralProgram[]) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [showAllLinks, setShowAllLinks] = useState(false);
  const visibleLinks = showAllLinks ? links : links.slice(0, 5);

  async function handleToggleActive(program: ReferralProgram) {
    const ok = await updateReferralProgramActiveAction(restaurantId, program.id, !program.active);
    if (ok) {
      onChange(programs.map((p) => (p.id === program.id ? { ...p, active: !p.active } : p)));
    } else {
      notifyError("La mise à jour a échoué.");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (
      !window.confirm(
        `Supprimer le programme "${name}" ? Tous les liens de parrainage et l'historique des filleuls de ce programme seront définitivement supprimés.`
      )
    ) {
      return;
    }
    const ok = await deleteReferralProgramAction(restaurantId, id);
    if (ok) onChange(programs.filter((p) => p.id !== id));
  }

  return (
    <>
      <Card>
        <CardHeader
          eyebrow="Parrainage"
          title="Programmes de parrainage"
          description="Vos clients partagent un lien depuis leur espace client — suivez qui génère quoi."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Nouveau programme
            </Button>
          }
        />

        {programs.length === 0 ? (
          <p className="text-[12.5px] text-mv-ink-faint">Aucun programme de parrainage pour l&apos;instant.</p>
        ) : (
          <div className="mb-4 space-y-1.5">
            {programs.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-mv-ink">{p.name}</p>
                  <p className="text-[11.5px] text-mv-ink-faint">
                    Objectif : {p.goalCount} parrainage{p.goalCount > 1 ? "s" : ""}
                    {p.rewardDescription ? ` — ${p.rewardDescription}` : ""}
                  </p>
                  {(p.referrerBonusPoints > 0 || p.newCustomerBonusPoints > 0) && (
                    <p className="mt-0.5 text-[11.5px] text-mv-green-dark">
                      Bonus immédiat : +{p.referrerBonusPoints} pts parrain / +{p.newCustomerBonusPoints} pts filleul
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={p.active ? "green" : "neutral"}>{p.active ? "Actif" : "Inactif"}</Badge>
                  <button
                    onClick={() => handleToggleActive(p)}
                    className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-ink-soft hover:bg-mv-ink/5"
                  >
                    {p.active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    aria-label="Supprimer le programme"
                    className="text-mv-ink-faint transition-colors hover:text-mv-red"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {links.length > 0 && (
          <div className="border-t border-mv-border-soft pt-3">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              Suivi des liens
            </p>
            <div className="space-y-1.5">
              {visibleLinks.map((t) => (
                <ReferralLinkRow key={t.link.id} tracking={t} />
              ))}
            </div>
            {links.length > 5 && (
              <button
                onClick={() => setShowAllLinks((v) => !v)}
                className="mt-2 text-[12px] font-semibold text-mv-green-dark hover:underline"
              >
                {showAllLinks ? "Afficher moins" : `Afficher les ${links.length - 5} autre(s)`}
              </button>
            )}
          </div>
        )}
      </Card>

      <NewReferralProgramModal
        restaurantId={restaurantId}
        rewards={rewards}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(program) => onChange([program, ...programs])}
      />
    </>
  );
}

export function ParrainageView({
  restaurantId,
  initialReferralPrograms,
  referralLinks,
  rewards,
  referralRoi,
  topAmbassadors,
  dailyActivity = [],
}: {
  restaurantId: string | null;
  initialReferralPrograms: ReferralProgram[];
  referralLinks: ReferralLinkTracking[];
  rewards: LoyaltyReward[];
  referralRoi: ReferralRoiMetrics;
  topAmbassadors: TopAmbassador[];
  dailyActivity?: ReferralDailyActivity[];
}) {
  const [referralPrograms, setReferralPrograms] = useState(initialReferralPrograms);

  return (
    <div>
      <FidelisationSubNav />
      <PageHeader
        eyebrow="Croissance"
        title="Parrainage"
        description="Performance du programme de parrainage et suivi des liens partagés par vos clients."
      />
      <div className="space-y-6">
        <ReferralRoiDashboard metrics={referralRoi} ambassadors={topAmbassadors} />
        <ReferralActivityHeatmap activity={dailyActivity} />
        {restaurantId && (
          <ReferralProgramsCard
            restaurantId={restaurantId}
            programs={referralPrograms}
            rewards={rewards}
            links={referralLinks}
            onChange={setReferralPrograms}
          />
        )}
      </div>
    </div>
  );
}
