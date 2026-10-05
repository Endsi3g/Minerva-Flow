"use client";


import { useTranslations } from "next-intl";
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
import type { ReferralInvitationActivity, ReferralLinkTracking } from "@/lib/data/customer-referrals";
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
  const t = useTranslations("referralView");
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
        notifyError(t("couldNotCreateThe"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("newReferralProgram")}
      description={t("yourCustomersShareA")}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={t("name")}>
          <Input name="name" placeholder={t("eGBringA")} required autoFocus />
        </Field>
        <Field label={t("description")} hint={t("optional")}>
          <Input name="description" placeholder={t("eGValidUntil")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("goal")} hint={t("numberOfSuccessfulReferrals")}>
            <Input name="goalCount" type="number" min="1" step="1" defaultValue="1" required />
          </Field>
          <Field label={t("catalogReward")} hint={t("optional")}>
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
        <Field label={t("orDescribeTheReward")} hint={t("optionalShownToThe")}>
          <Input name="rewardDescription" placeholder={t("eGFreeDessert")} />
        </Field>
        <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 p-3">
          <p className="mb-2 text-[12px] font-semibold text-mv-ink">{t("instantBonusOnConversion")}</p>
          <p className="mb-3 text-[12px] leading-snug text-mv-ink-faint">
            {t("instantBonusHint")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("forTheReferrer")} hint={t("points")}>
              <Input name="referrerBonusPoints" type="number" min="0" step="1" defaultValue="0" />
            </Field>
            <Field label={t("forTheNewCustomer")} hint={t("points")}>
              <Input name="newCustomerBonusPoints" type="number" min="0" step="1" defaultValue="0" />
            </Field>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("creating") : t("create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReferralLinkRow({ tracking }: { tracking: ReferralLinkTracking }) {
  const t = useTranslations("referralView");
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${tracking.link.code}?via=copy`;

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
        <HelperTooltip content={t("numberOfTimesSomeone")}>
          <span className="flex items-center gap-1 cursor-help">
            <MousePointerClick size={12} /> {tracking.link.clicks}
          </span>
        </HelperTooltip>
        <HelperTooltip content={t("numberOfReferredFriends")}>
          <span className="flex items-center gap-1 cursor-help">
            <Link2 size={12} /> {tracking.link.convertedCount}
          </span>
        </HelperTooltip>
        {tracking.link.rewardClaimedAt && <Badge tone="green">{t("unlocked")}</Badge>}
        <button
          onClick={() => window.open(url, "_blank")}
          aria-label={t("openTheReferralLink")}
          title={t("openTheLink")}
          className="text-mv-ink-faint transition-colors hover:text-mv-ink"
        >
          <ExternalLink size={13} />
        </button>
        <button
          onClick={handleCopy}
          aria-label={t("copyTheReferralLink")}
          title={t("copyTheReferralLink")}
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
  const t = useTranslations("referralView");
  const [createOpen, setCreateOpen] = useState(false);
  const [showAllLinks, setShowAllLinks] = useState(false);
  const visibleLinks = showAllLinks ? links : links.slice(0, 5);

  async function handleToggleActive(program: ReferralProgram) {
    const ok = await updateReferralProgramActiveAction(restaurantId, program.id, !program.active);
    if (ok) {
      onChange(programs.map((p) => (p.id === program.id ? { ...p, active: !p.active } : p)));
    } else {
      notifyError(t("theUpdateFailed"));
    }
  }

  async function handleDelete(id: string, name: string) {
    if (
      !window.confirm(
        t("confirmDeleteProgram", { name })
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
          eyebrow={t("referral")}
          title={t("referralPrograms")}
          description={t("yourCustomersShareA2")}
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Nouveau programme
            </Button>
          }
        />

        {programs.length === 0 ? (
          <p className="text-[12.5px] text-mv-ink-faint">{t("noReferralProgramsYet")}</p>
        ) : (
          <div className="mb-4 space-y-1.5">
            {programs.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-mv-ink">{p.name}</p>
                  <p className="text-[12px] text-mv-ink-faint">
                    Objectif : {p.goalCount} parrainage{p.goalCount > 1 ? "s" : ""}
                    {p.rewardDescription ? ` — ${p.rewardDescription}` : ""}
                  </p>
                  {(p.referrerBonusPoints > 0 || p.newCustomerBonusPoints > 0) && (
                    <p className="mt-0.5 text-[12px] text-mv-green-dark">
                      {t("instantBonusLine", { referrer: p.referrerBonusPoints, referee: p.newCustomerBonusPoints })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={p.active ? "green" : "neutral"}>{p.active ? "Actif" : "Inactif"}</Badge>
                  <button
                    onClick={() => handleToggleActive(p)}
                    className="rounded-md px-2 py-1 text-[12px] font-medium text-mv-ink-soft hover:bg-mv-ink/5"
                  >
                    {p.active ? t("turnOff") : "Activer"}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    aria-label={t("deleteTheProgram")}
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
              {t("linkTracking")}
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
                {showAllLinks ? t("showLess") : t("showOthers", { count: links.length - 5 })}
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
  invitations = [],
}: {
  restaurantId: string | null;
  initialReferralPrograms: ReferralProgram[];
  referralLinks: ReferralLinkTracking[];
  rewards: LoyaltyReward[];
  referralRoi: ReferralRoiMetrics;
  topAmbassadors: TopAmbassador[];
  dailyActivity?: ReferralDailyActivity[];
  invitations?: ReferralInvitationActivity[];
}) {
  const t = useTranslations("referralView");
  const [referralPrograms, setReferralPrograms] = useState(initialReferralPrograms);

  return (
    <div>
      <FidelisationSubNav />
      <PageHeader
        eyebrow={t("growth")}
        title={t("referral")}
        description={t("referralProgramPerformanceAnd")}
      />
      <div className="space-y-6">
        <ReferralRoiDashboard metrics={referralRoi} ambassadors={topAmbassadors} />
        <ReferralActivityHeatmap activity={dailyActivity} />
        <ReferralInvitationsTable invitations={invitations} />
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

function ReferralInvitationsTable({ invitations }: { invitations: ReferralInvitationActivity[] }) {
  const t = useTranslations("referralView");
  const channelLabels = { qr: "Code QR", share: "Partage", copy: t("linkCopied"), code: "Code", direct: "Lien direct" };
  return (
    <Card className="w-full min-w-0">
      <CardHeader eyebrow={t("traceability")} title={t("convertedInvitations")} description={t("whoInvitedEachNew")} />
      {invitations.length === 0 ? (
        <p className="rounded-xl border border-dashed border-mv-border-soft p-5 text-center text-[12.5px] text-mv-ink-faint">{t("invitationsWillAppearAs")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[12.5px]">
            <thead><tr className="border-b border-mv-border-soft text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint"><th className="py-2 pr-3">{t("referrer")}</th><th className="py-2 pr-3">{t("newCustomer")}</th><th className="py-2 pr-3">{t("channel")}</th><th className="py-2 pr-3">{t("action")}</th><th className="py-2 text-right">{t("date")}</th></tr></thead>
            <tbody className="divide-y divide-mv-border-soft">
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="py-2.5 pr-3 font-medium text-mv-ink">{invitation.inviterName}</td>
                  <td className="py-2.5 pr-3 text-mv-ink-soft">{invitation.inviteeName}</td>
                  <td className="py-2.5 pr-3"><Badge tone="green" variant="subtle" size="sm">{channelLabels[invitation.channel]}</Badge></td>
                  <td className="py-2.5 pr-3 text-mv-ink-soft">{invitation.conversionType === "reservation" ? t("booking") : "Commande"}</td>
                  <td className="py-2.5 text-right text-mv-ink-faint">{new Date(invitation.createdAt).toLocaleDateString("fr-CA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
