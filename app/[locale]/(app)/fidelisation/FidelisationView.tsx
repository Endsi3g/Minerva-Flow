"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { HelperTooltip } from "@/components/ui/HelperTooltip";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { Customer, LoyaltyReward, LoyaltyShare, LoyaltyTransactionType, ReferralProgram } from "@/lib/types";
import {
  loyaltyTierOrder,
  loyaltyTierLabel,
  loyaltyTierDescription,
  loyaltyTierBadge,
  getLoyaltyTier,
  type LoyaltyTierThresholds,
} from "@/lib/loyalty-tiers";
import { LoyaltyTierBadge } from "@/components/minerva/LoyaltyTierBadge";
import type { ReferralLinkTracking } from "@/lib/data/customer-referrals";
import { Heart, Plus, Trash2, Gift, Search, Link2, MousePointerClick, Send, Copy, Check, Share2, Download, QrCode, Zap } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import QRCode from "qrcode";
import {
  createCustomerAction,
  deleteCustomerAction,
  logVisitAction,
  redeemRewardAction,
  createLoyaltyRewardAction,
  deleteLoyaltyRewardAction,
  updateLoyaltyRateAction,
  createReferralProgramAction,
  updateReferralProgramActiveAction,
  deleteReferralProgramAction,
  sendPortalLinkAction,
  createLoyaltyShareAction,
  deleteLoyaltyShareAction,
  updateRetentionSettingsAction,
  updateLoyaltyTierThresholdsAction,
  claimRewardRedemptionAction,
} from "./actions";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify-error";

const txLabel: Record<LoyaltyTransactionType, string> = {
  visite: "Visite",
  ajustement: "Ajustement",
  echange: "Échange",
};

function NewCustomerModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (c: Customer) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const customer = await createCustomerAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? "") || null,
        phone: String(form.get("phone") ?? "") || null,
        notes: String(form.get("notes") ?? "") || null,
        birthday: String(form.get("birthday") ?? "") || null,
        marketingConsent,
        consentSource: "staff",
      });
      if (customer) {
        onCreated(customer);
        onClose();
        (e.target as HTMLFormElement).reset();
        setMarketingConsent(false);
      } else {
        notifyError("L'ajout du client a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau client" description="Créez une fiche pour commencer à suivre ses visites.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom">
          <Input name="name" placeholder="Ex : Jeanne Tremblay" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Courriel" hint="Optionnel">
            <Input name="email" type="email" />
          </Field>
          <Field label="Téléphone" hint="Optionnel">
            <Input name="phone" type="tel" />
          </Field>
        </div>
        <Field label="Notes" hint="Optionnel — allergies, préférences…">
          <Input name="notes" />
        </Field>
        <Field label="Date de naissance" hint="Optionnel — pour les campagnes anniversaire">
          <Input name="birthday" type="date" />
        </Field>
        <label className="flex items-start gap-2 text-[12px] text-mv-ink-soft">
          <Checkbox
            checked={marketingConsent}
            onCheckedChange={(checked) => setMarketingConsent(Boolean(checked))}
            className="mt-0.5"
          />
          <span>Le client accepte de recevoir des offres et rappels par courriel ou SMS.</span>
        </label>
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

function RetentionSettingsCard({
  restaurantId,
  initialEnabled,
  initialInactivityDays,
}: {
  restaurantId: string;
  initialEnabled: boolean;
  initialInactivityDays: number;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [inactivityDays, setInactivityDays] = useState(initialInactivityDays);
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggle(next: boolean) {
    setEnabled(next);
    setIsSaving(true);
    try {
      const ok = await updateRetentionSettingsAction(restaurantId, { enabled: next });
      if (!ok) {
        setEnabled(!next);
        notifyError("La mise à jour a échoué.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleInactivityBlur() {
    if (inactivityDays === initialInactivityDays) return;
    await updateRetentionSettingsAction(restaurantId, { inactivityDays });
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Automatisation"
        title="Rétention automatique"
        description="Relance par courriel/SMS/notification les clients inactifs, ceux qui décrochent, et pour leur anniversaire — sans intervention."
        action={
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isSaving}
            className="data-checked:bg-mv-green"
            aria-label={enabled ? "Désactiver la rétention automatique" : "Activer la rétention automatique"}
          />
        }
      />
      <div className="flex items-center gap-2 text-[12.5px] text-mv-ink-soft">
        <Zap size={13} className="text-mv-green-dark" />
        Considérer un client inactif après
        <input
          type="number"
          min="1"
          value={inactivityDays}
          onChange={(e) => setInactivityDays(Number(e.target.value))}
          onBlur={handleInactivityBlur}
          className="h-7 w-16 rounded-md border border-mv-border bg-mv-surface px-2 text-center text-[12.5px]"
        />
        jours sans visite. Seuls les clients ayant consenti à recevoir des offres sont ciblés.
        <HelperTooltip content="Un même client n'est jamais relancé deux fois pour la même chose : anniversaire, décrochage et inactivité sont priorisés dans cet ordre, et un délai minimal (30 jours par défaut) s'applique toujours entre deux relances." />
      </div>
    </Card>
  );
}

function LoyaltyTierSettingsCard({
  restaurantId,
  initialThresholds,
}: {
  restaurantId: string;
  initialThresholds: LoyaltyTierThresholds;
}) {
  const [tier2, setTier2] = useState(initialThresholds.tier2);
  const [tier3, setTier3] = useState(initialThresholds.tier3);

  async function handleBlur(patch: { tier2?: number; tier3?: number }) {
    await updateLoyaltyTierThresholdsAction(restaurantId, patch);
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Statut client"
        title={
          <span className="flex items-center gap-1.5">
            Paliers de fidélité
            <HelperTooltip content="Le seuil correspond à la dépense cumulée à vie du client (total_spent), recalculée automatiquement à chaque visite — aucune attribution manuelle n'est nécessaire." />
          </span>
        }
        description="Une progression premium plutôt que des paliers génériques — le palier le plus élevé est le meilleur candidat pour parrainer."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {loyaltyTierOrder.map((tier, i) => {
          const { tone, variant, icon: Icon } = loyaltyTierBadge[tier];
          return (
            <div key={tier} className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 p-3">
              <Badge tone={tone} variant={variant}>
                <Icon size={12} strokeWidth={2.4} />
                {loyaltyTierLabel[tier]}
              </Badge>
              <p className="mt-2 text-[11.5px] leading-snug text-mv-ink-faint">{loyaltyTierDescription[tier]}</p>
              <p className="mt-2 text-[12px] text-mv-ink-soft">
                {i === 0 ? (
                  "Dès l'inscription"
                ) : (
                  <>
                    Dès{" "}
                    <input
                      type="number"
                      min="0"
                      value={i === 1 ? tier2 : tier3}
                      onChange={(e) => (i === 1 ? setTier2(Number(e.target.value)) : setTier3(Number(e.target.value)))}
                      onBlur={() => handleBlur(i === 1 ? { tier2 } : { tier3 })}
                      className="h-7 w-20 rounded-md border border-mv-border bg-mv-surface px-2 text-center text-[12px]"
                    />{" "}
                    $ dépensés
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RewardsCard({
  restaurantId,
  rewards,
  onChange,
}: {
  restaurantId: string;
  rewards: LoyaltyReward[];
  onChange: (rewards: LoyaltyReward[]) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const reward = await createLoyaltyRewardAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? "") || undefined,
        pointsCost: Number(form.get("pointsCost") ?? 0),
      });
      if (reward) {
        onChange([...rewards, reward].sort((a, b) => a.pointsCost - b.pointsCost));
        (e.target as HTMLFormElement).reset();
      } else {
        notifyError("L'ajout de la récompense a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Retirer la récompense "${name}" ?`)) return;
    const ok = await deleteLoyaltyRewardAction(restaurantId, id);
    if (ok) onChange(rewards.filter((r) => r.id !== id));
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Catalogue"
        title="Récompenses"
        description="Ce que les clients peuvent échanger contre leurs points."
      />
      <div className="mb-3 space-y-1.5">
        {rewards.length === 0 && <p className="text-[12.5px] text-mv-ink-faint">Aucune récompense configurée.</p>}
        {rewards.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-mv-border-soft px-3 py-2">
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-mv-ink">{r.name}</span>
              {r.description && <p className="mt-0.5 text-[11.5px] text-mv-ink-faint">{r.description}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="neutral">{r.pointsCost} pts</Badge>
              <button
                onClick={() => handleDelete(r.id, r.name)}
                aria-label="Retirer la récompense"
                className="text-mv-ink-faint transition-colors hover:text-mv-red"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="space-y-2 border-t border-mv-border-soft pt-3">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Nom">
            <Input name="name" placeholder="Ex : Café gratuit" required className="w-56" />
          </Field>
          <Field label="Coût en points">
            <Input name="pointsCost" type="number" min="1" step="1" required className="w-28" />
          </Field>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            <Plus size={14} /> Ajouter
          </Button>
        </div>
        <Field label="Description (optionnel)">
          <Input name="description" placeholder="Ex : Tout format, toute la journée" className="w-full" />
        </Field>
      </form>
    </Card>
  );
}

function RewardValidationCard({ restaurantId }: { restaurantId: string }) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    rewardName: string;
    pointsSpent: number;
    customerName: string;
    claimedAt: string;
  } | null>(null);

  async function handleValidate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim()) return;
    setIsSubmitting(true);
    setResult(null);
    try {
      const claimed = await claimRewardRedemptionAction(restaurantId, code);
      if (claimed) {
        setResult(claimed);
        setCode("");
      } else {
        notifyError("Code introuvable ou déjà utilisé.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Au comptoir"
        title="Valider une récompense"
        description="Le client échange ses points depuis son espace client et reçoit un code — entrez-le ici pour confirmer."
      />
      <form onSubmit={handleValidate} className="flex flex-wrap items-end gap-2">
        <Field label="Code du client">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex : A1B2C3"
            className="w-40 font-mono uppercase tracking-wider"
            maxLength={6}
          />
        </Field>
        <Button type="submit" size="sm" disabled={isSubmitting || !code.trim()}>
          <Check size={14} /> Valider
        </Button>
      </form>
      {result && (
        <div className="mv-check-pop mt-3 flex items-start gap-2.5 rounded-lg border border-mv-green/20 bg-mv-green-tint px-3 py-2.5">
          <Check size={15} className="mt-0.5 shrink-0 text-mv-green-dark" />
          <p className="text-[12.5px] leading-relaxed text-mv-green-darker">
            <strong className="font-semibold">{result.rewardName}</strong> validée pour {result.customerName}
            {" "}(-{result.pointsSpent} pts).
          </p>
        </div>
      )}
    </Card>
  );
}

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

  function handleCopy() {
    const url = `${window.location.origin}/p/${tracking.link.code}`;
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
        <span className="flex items-center gap-1">
          <MousePointerClick size={12} /> {tracking.link.clicks}
        </span>
        <span className="flex items-center gap-1">
          <Link2 size={12} /> {tracking.link.convertedCount}
        </span>
        {tracking.link.rewardClaimedAt && <Badge tone="green">Débloquée</Badge>}
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
              {links.map((t) => (
                <ReferralLinkRow key={t.link.id} tracking={t} />
              ))}
            </div>
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

function LoyaltyShareRow({ share, onDeleted }: { share: LoyaltyShare; onDeleted: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://minerva-flow.vercel.app"}/f/${share.token}`;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 512, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [url]);

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${share.title.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-mv-border-soft px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="" className="h-9 w-9 shrink-0 rounded border border-mv-border-soft" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-mv-ink">{share.title}</p>
          <p className="truncate text-[11.5px] text-mv-ink-faint">/f/{share.token}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="text-mv-ink-faint hover:text-mv-ink disabled:opacity-40"
          aria-label="Télécharger le code QR"
        >
          <Download size={14} />
        </button>
        <button onClick={handleCopy} className="text-mv-ink-faint hover:text-mv-ink" aria-label="Copier le lien">
          {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
        </button>
        <button
          onClick={() => onDeleted(share.id)}
          className="text-mv-ink-faint hover:text-mv-red"
          aria-label="Supprimer le lien"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function ShareLoyaltyModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (share: LoyaltyShare) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const share = await createLoyaltyShareAction(restaurantId, String(form.get("title") ?? "") || "Fidélité");
      if (share) {
        onCreated(share);
        onClose();
      } else {
        notifyError("La création du lien a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Partager la fidélité"
      description="Génère un lien public — un nouveau client peut rejoindre le programme sans avoir de fiche existante."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Titre" hint="Affiché sur la page publique">
          <Input name="title" placeholder="Fidélité" defaultValue="Fidélité" required autoFocus />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Générer le lien"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function LoyaltyShareCard({
  restaurantId,
  shares,
  onChange,
}: {
  restaurantId: string;
  shares: LoyaltyShare[];
  onChange: (shares: LoyaltyShare[]) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);

  function handleDeleted(id: string) {
    deleteLoyaltyShareAction(restaurantId, id).then((ok) => {
      if (ok) onChange(shares.filter((s) => s.id !== id));
      else notifyError("La suppression a échoué.");
    });
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Croissance"
        title="Partager la fidélité"
        description="Un lien ou un code QR pour qu'un nouveau client rejoigne le programme lui-même."
        action={
          <Button size="sm" variant="secondary" onClick={() => setShareOpen(true)}>
            <Share2 size={14} /> Nouveau lien
          </Button>
        }
      />
      {shares.length === 0 ? (
        <p className="flex items-center gap-2 text-[12.5px] text-mv-ink-faint">
          <QrCode size={14} /> Aucun lien généré pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-2">
          {shares.map((s) => (
            <LoyaltyShareRow key={s.id} share={s} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
      <ShareLoyaltyModal
        restaurantId={restaurantId}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onCreated={(s) => onChange([s, ...shares])}
      />
    </Card>
  );
}

export function FidelisationView({
  restaurantId,
  initialCustomers,
  initialRewards,
  loyaltyPointsPerDollar,
  initialReferralPrograms,
  referralLinks,
  initialLoyaltyShares,
  retentionEngineEnabled,
  retentionInactivityDays,
  loyaltyTierThresholds,
}: {
  restaurantId: string | null;
  initialCustomers: Customer[];
  initialRewards: LoyaltyReward[];
  loyaltyPointsPerDollar: number;
  initialReferralPrograms: ReferralProgram[];
  referralLinks: ReferralLinkTracking[];
  initialLoyaltyShares: LoyaltyShare[];
  retentionEngineEnabled: boolean;
  retentionInactivityDays: number;
  loyaltyTierThresholds: LoyaltyTierThresholds;
}) {
  const { role } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [customers, setCustomers] = useState(initialCustomers);
  const [rewards, setRewards] = useState(initialRewards);
  const [referralPrograms, setReferralPrograms] = useState(initialReferralPrograms);
  const [loyaltyShares, setLoyaltyShares] = useState(initialLoyaltyShares);
  const [rate, setRate] = useState(loyaltyPointsPerDollar);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [createOpen, setCreateOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [sendingPortalLinkFor, setSendingPortalLinkFor] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCreate = Boolean(restaurantId) && (role === "owner" || role === "manager" || role === "staff");
  const canManage = role === "owner" || role === "manager";

  function handleSelect(id: string) {
    setSelectedId(id);
    router.push(`/fidelisation?id=${id}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const selected = customers.find((c) => c.id === selectedId);

  async function handleVisitSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!restaurantId || !selected) return;
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount") ?? 0);
    const note = String(form.get("note") ?? "") || null;
    if (!Number.isFinite(amount) || amount <= 0) return;

    const tierBefore = getLoyaltyTier(selected.totalSpent, loyaltyTierThresholds);
    const updated = await logVisitAction(restaurantId, selected.id, amount, note);
    if (updated) {
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setVisitOpen(false);
      (e.target as HTMLFormElement).reset();

      const tierAfter = getLoyaltyTier(updated.totalSpent, loyaltyTierThresholds);
      if (loyaltyTierOrder.indexOf(tierAfter) > loyaltyTierOrder.indexOf(tierBefore)) {
        toast.success(`${updated.name} passe au palier ${loyaltyTierLabel[tierAfter]} !`, {
          icon: "🎉",
          duration: 5000,
        });
      }
    } else {
      notifyError("L'enregistrement de la visite a échoué.");
    }
  }

  async function handleSendPortalLink(customerId: string, email: string) {
    if (!restaurantId) return;
    setSendingPortalLinkFor(customerId);
    try {
      const result = await sendPortalLinkAction(restaurantId, customerId);
      if (result.ok) {
        toast.success(`Lien envoyé à ${email}.`);
      } else {
        notifyError(result.error ?? "L'envoi du lien a échoué.");
      }
    } finally {
      setSendingPortalLinkFor(null);
    }
  }

  async function handleRedeem(rewardId: string) {
    if (!restaurantId || !selected) return;
    const updated = await redeemRewardAction(restaurantId, selected.id, rewardId);
    if (updated) {
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      notifyError("L'échange a échoué — solde de points insuffisant ?");
    }
  }

  function handleDelete(id: string, name: string) {
    if (!restaurantId) return;
    if (!window.confirm(`Supprimer la fiche client "${name}" ? Son historique de points et de visites sera perdu.`)) return;
    startTransition(async () => {
      const ok = await deleteCustomerAction(restaurantId, id);
      if (ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        if (selectedId === id) setSelectedId(null);
      } else {
        notifyError("La suppression a échoué.");
      }
    });
  }

  async function handleRateBlur() {
    if (!restaurantId || !canManage) return;
    await updateLoyaltyRateAction(restaurantId, rate);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Clients"
        title="Fidélisation"
        description="Fiches clients, visites et points de fidélité."
        action={
          canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Nouveau client
            </Button>
          )
        }
      />

      <div className="mb-6">
        <RewardValidationCard restaurantId={restaurantId!} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mv-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="pl-8"
          />
        </div>
        {canManage && (
          <label
            className="flex items-center gap-1.5 text-[12.5px] text-mv-ink-soft"
            title="Points attribués par dollar dépensé — s'applique aux prochaines visites"
          >
            Taux :
            <input
              type="number"
              min="0"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              onBlur={handleRateBlur}
              className="h-8 w-16 rounded-md border border-mv-border bg-mv-surface px-2 text-[12.5px]"
            />
            pts/$
          </label>
        )}
        <span className="text-[12.5px] text-mv-ink-faint">
          {filtered.length} client{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={selected ? "xl:col-span-7" : "xl:col-span-12"}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="Aucun client"
              description="Ajoutez votre première fiche client pour commencer à suivre les visites et les points."
              action={
                canCreate && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus size={15} /> Nouveau client
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>Client</Th>
                <Th>Dernière visite</Th>
                <Th className="text-right">Visites</Th>
                <Th className="text-right">Total dépensé</Th>
                <Th className="text-right">Points</Th>
              </THead>
              <tbody>
                {filtered.map((c) => (
                  <Tr key={c.id} onClick={() => handleSelect(c.id)} active={c.id === selectedId}>
                    <Td className="font-semibold">
                      <div className="flex items-center gap-2">
                        {c.name}
                        <LoyaltyTierBadge totalSpent={c.totalSpent} thresholds={loyaltyTierThresholds} size="xs" />
                      </div>
                    </Td>
                    <Td className="text-mv-ink-soft">{c.lastVisitAt ? formatDate(c.lastVisitAt) : "—"}</Td>
                    <Td className="text-right">{c.visitCount}</Td>
                    <Td className="text-right font-medium">{formatCurrency(c.totalSpent)}</Td>
                    <Td className="text-right">
                      <Badge tone="green">{c.loyaltyPoints} pts</Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {selected && (
          <div className="xl:col-span-5">
            <div className="space-y-4 xl:sticky xl:top-6">
              <Card>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge tone="green">{selected.loyaltyPoints} points</Badge>
                    <LoyaltyTierBadge totalSpent={selected.totalSpent} thresholds={loyaltyTierThresholds} />
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(selected.id, selected.name)}
                      disabled={isPending}
                      aria-label="Supprimer le client"
                      className="rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-red/10 hover:text-mv-red disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <h2 className="font-display text-[19px] font-medium text-mv-ink">{selected.name}</h2>
                <p className="text-[12.5px] text-mv-ink-faint">
                  {[selected.email, selected.phone].filter(Boolean).join(" — ") || "Aucune coordonnée"}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-mv-cream-soft p-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Visites</p>
                    <p className="font-display text-[16px] font-medium text-mv-ink">{selected.visitCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Total dépensé</p>
                    <p className="font-display text-[16px] font-medium text-mv-ink">
                      {formatCurrency(selected.totalSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Points</p>
                    <p className="font-display text-[16px] font-medium text-mv-green-dark">
                      {selected.loyaltyPoints}
                    </p>
                  </div>
                </div>

                {canCreate && (
                  <Button size="sm" onClick={() => setVisitOpen(true)} className="mt-4 w-full">
                    <Plus size={14} /> Enregistrer une visite
                  </Button>
                )}
                {canCreate && selected.email && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSendPortalLink(selected.id, selected.email!)}
                    disabled={sendingPortalLinkFor === selected.id}
                    className="mt-2 w-full"
                    title="Envoie un lien de connexion sans mot de passe directement au courriel du client"
                  >
                    <Send size={14} />
                    {sendingPortalLinkFor === selected.id ? "Envoi…" : "Envoyer le lien du portail"}
                  </Button>
                )}
              </Card>

              <Card>
                <CardHeader title="Récompenses" description={`${rewards.filter((r) => r.active).length} disponible(s)`} />
                {rewards.filter((r) => r.active).length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">Aucune récompense configurée.</p>
                ) : (
                  <div className="space-y-2">
                    {rewards
                      .filter((r) => r.active)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <Gift size={14} className="text-mv-ink-faint" />
                            <span className="text-[13px] font-medium text-mv-ink">{r.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone="neutral">{r.pointsCost} pts</Badge>
                            {canCreate && (
                              <Button
                                size="xs"
                                variant="secondary"
                                disabled={selected.loyaltyPoints < r.pointsCost}
                                onClick={() => handleRedeem(r.id)}
                              >
                                Échanger
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader title="Historique" description={`${selected.transactions.length} transaction(s)`} />
                {selected.transactions.length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">Aucune transaction pour ce client.</p>
                ) : (
                  <div className="space-y-0">
                    {selected.transactions.map((t, i) => {
                      const dotTone =
                        t.type === "visite" ? "bg-mv-green" : t.type === "echange" ? "bg-mv-lime-dark" : "bg-mv-ink-faint";
                      const isLast = i === selected.transactions.length - 1;
                      return (
                        <div key={t.id} className="relative flex gap-3 pb-4 last:pb-0">
                          {!isLast && (
                            <span className="absolute left-[5px] top-[14px] bottom-0 w-px bg-mv-border-soft" />
                          )}
                          <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-mv-surface shadow-sm ${dotTone}`} />
                          <div className="min-w-0 flex-1 rounded-lg bg-mv-cream-soft p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[12px] font-semibold text-mv-ink">{txLabel[t.type]}</span>
                              <span className="text-[11px] text-mv-ink-faint">{formatDate(t.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[12.5px]">
                              <span className="text-mv-ink-soft">
                                {t.note ?? (t.amountSpent != null ? formatCurrency(t.amountSpent) : "—")}
                              </span>
                              <span className={t.pointsDelta >= 0 ? "font-semibold text-mv-green-dark" : "font-semibold text-mv-red"}>
                                {t.pointsDelta >= 0 ? "+" : ""}
                                {t.pointsDelta} pts
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {canManage && (
        <div className="mt-6 space-y-6">
          <LoyaltyTierSettingsCard restaurantId={restaurantId!} initialThresholds={loyaltyTierThresholds} />
          <RetentionSettingsCard
            restaurantId={restaurantId!}
            initialEnabled={retentionEngineEnabled}
            initialInactivityDays={retentionInactivityDays}
          />
          <RewardsCard restaurantId={restaurantId!} rewards={rewards} onChange={setRewards} />
          <LoyaltyShareCard restaurantId={restaurantId!} shares={loyaltyShares} onChange={setLoyaltyShares} />
          <ReferralProgramsCard
            restaurantId={restaurantId!}
            programs={referralPrograms}
            rewards={rewards}
            links={referralLinks}
            onChange={setReferralPrograms}
          />
        </div>
      )}

      {restaurantId && (
        <NewCustomerModal
          restaurantId={restaurantId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
            handleSelect(c.id);
          }}
        />
      )}

      {selected && (
        <Modal open={visitOpen} onClose={() => setVisitOpen(false)} title="Enregistrer une visite" description={`Pour ${selected.name}`}>
          <form onSubmit={handleVisitSubmit} className="space-y-3">
            <Field label="Montant dépensé">
              <Input name="amount" type="number" min="0" step="0.01" required autoFocus />
            </Field>
            <Field label="Note" hint="Optionnel">
              <Input name="note" placeholder="Ex : anniversaire, groupe de 6" />
            </Field>
            <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
              <Button type="button" variant="ghost" onClick={() => setVisitOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
