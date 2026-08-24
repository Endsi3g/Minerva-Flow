"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getLoyaltyTier,
  loyaltyTierLabel,
  loyaltyTierBadge,
  type LoyaltyTier,
  type LoyaltyTierThresholds,
} from "@/lib/loyalty-tiers";
import { LogoMark } from "@/components/shell/Logo";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Customer, CustomerReferralLink, LoyaltyReward, ReferralProgram, RewardRedemption } from "@/lib/types";
import type { PortalData, PortalReferralProgress } from "@/lib/data/customer-portal";
import { getOrCreateReferralLinkAction, updateMyProfileAction, selfRedeemRewardAction } from "./actions";
import { Copy, Check, Gift, Share2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const walletTierBg: Record<LoyaltyTier, string> = {
  habitue: "bg-mv-ink text-mv-cream",
  privilegie: "bg-mv-green-dark text-mv-cream",
  ambassadeur: "bg-mv-lime text-mv-ink",
};

function LoyaltyWalletCard({
  points,
  visitCount,
  totalSpent,
  thresholds,
}: {
  points: number;
  visitCount: number;
  totalSpent: number;
  thresholds: LoyaltyTierThresholds;
}) {
  const t = useTranslations("portal.view");
  const tier = getLoyaltyTier(totalSpent, thresholds);
  const { icon: Icon } = loyaltyTierBadge[tier];

  const prevTarget = tier === "ambassadeur" ? thresholds.tier3 : tier === "privilegie" ? thresholds.tier2 : 0;
  const nextTarget = tier === "habitue" ? thresholds.tier2 : tier === "privilegie" ? thresholds.tier3 : null;
  const progress = nextTarget ? Math.min(1, Math.max(0, (totalSpent - prevTarget) / (nextTarget - prevTarget))) : 1;

  return (
    <div className={`mb-6 overflow-hidden rounded-2xl p-5 shadow-mv-md ${walletTierBg[tier]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{t("points")}</p>
          <p className="mt-0.5 font-display text-[32px] font-medium leading-none">{points}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold">
          <Icon size={14} /> {loyaltyTierLabel[tier]}
        </div>
      </div>

      {nextTarget !== null && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-[11.5px] opacity-80">
            {formatCurrency(Math.max(0, nextTarget - totalSpent))} avant le palier suivant
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-5 border-t border-white/15 pt-3 text-[12px] opacity-90">
        <span>
          {visitCount} {t("visits").toLowerCase()}
        </span>
        <span>{formatCurrency(totalSpent)}</span>
      </div>
    </div>
  );
}

function ProfileSettingsCard({ customer }: { customer: Customer }) {
  const [birthday, setBirthday] = useState(customer.birthday ?? "");
  const [marketingConsent, setMarketingConsent] = useState(customer.marketingConsent);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const ok = await updateMyProfileAction(customer.id, {
        marketingConsent,
        birthday: birthday || null,
      });
      if (ok) toast.success("Profil mis à jour.");
      else toast.error("La mise à jour a échoué.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Mon profil" description="Reçois des offres personnalisées et un cadeau le jour de ton anniversaire." />
      <div className="space-y-3">
        <Field label="Date de naissance" hint="Optionnel">
          <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-[12px] text-mv-ink-soft">
          <Checkbox
            checked={marketingConsent}
            onCheckedChange={(checked) => setMarketingConsent(Boolean(checked))}
            className="mt-0.5"
          />
          <span>J&apos;accepte de recevoir des offres et rappels par courriel ou SMS.</span>
        </label>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </Card>
  );
}

function ReferralProgramCard({
  program,
  link,
  onLinkCreated,
}: {
  program: ReferralProgram;
  link: CustomerReferralLink | null;
  onLinkCreated: (link: CustomerReferralLink) => void;
}) {
  const t = useTranslations("portal.view");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGetLink() {
    setIsCreating(true);
    try {
      const created = await getOrCreateReferralLinkAction(program.id);
      if (created) onLinkCreated(created);
      else toast.error(t("linkCreateFailed"));
    } finally {
      setIsCreating(false);
    }
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://minerva-flow.vercel.app"}/p/${link?.code}`;

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: program.name, text: program.description ?? undefined, url: shareUrl });
      } catch {
        // l'utilisateur a annulé le partage — rien à faire
      }
    } else {
      handleCopy();
    }
  }

  const progress = link ? Math.min(1, link.convertedCount / program.goalCount) : 0;

  return (
    <Card>
      <CardHeader title={program.name} description={program.description ?? undefined} />
      {link ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-mv-border-soft px-3 py-2">
            <span className="flex-1 truncate text-[12.5px] text-mv-ink-soft">{shareUrl}</span>
            <button
              onClick={handleShare}
              className="shrink-0 text-mv-ink-faint hover:text-mv-ink"
              aria-label="Partager le lien"
            >
              <Share2 size={14} />
            </button>
            <button
              onClick={handleCopy}
              className="shrink-0 text-mv-ink-faint hover:text-mv-ink"
              aria-label={t("copyLinkAria")}
            >
              {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
            </button>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-[12px] text-mv-ink-soft">
              <span>
                {link.convertedCount} / {program.goalCount}
              </span>
              {link.rewardClaimedAt && <Badge tone="green">{t("rewardUnlocked")}</Badge>}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-mv-ink/[0.08]">
              <div className="h-full rounded-full bg-mv-green" style={{ width: `${Math.max(4, progress * 100)}%` }} />
            </div>
          </div>
          {program.rewardDescription && (
            <p className="flex items-center gap-1.5 text-[12px] text-mv-ink-faint">
              <Gift size={13} /> {program.rewardDescription}
            </p>
          )}
        </div>
      ) : (
        <Button size="sm" onClick={handleGetLink} disabled={isCreating}>
          {isCreating ? t("creating") : t("getMyLink")}
        </Button>
      )}
    </Card>
  );
}

function RewardsRedeemCard({
  rewards,
  points,
  redemptions,
  onRedeemed,
}: {
  rewards: LoyaltyReward[];
  points: number;
  redemptions: RewardRedemption[];
  onRedeemed: (redemption: RewardRedemption) => void;
}) {
  const t = useTranslations("portal.view");
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  async function handleRedeem(reward: LoyaltyReward) {
    setRedeemingId(reward.id);
    try {
      const redemption = await selfRedeemRewardAction(reward.id);
      if (redemption) onRedeemed(redemption);
      else toast.error(t("redeemFailed"));
    } finally {
      setRedeemingId(null);
    }
  }

  const pending = redemptions.filter((r) => r.status === "pending");

  return (
    <Card>
      <CardHeader title={t("rewardsTitle")} description={t("points") + ` : ${points}`} />
      {rewards.length === 0 ? (
        <p className="text-[12.5px] text-mv-ink-faint">{t("rewardsEmpty")}</p>
      ) : (
        <div className="space-y-2">
          {rewards.map((reward) => {
            const affordable = points >= reward.pointsCost;
            return (
              <div
                key={reward.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-mv-border-soft px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-mv-ink">{reward.name}</p>
                  {reward.description && (
                    <p className="mt-0.5 text-[11.5px] text-mv-ink-faint">{reward.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={affordable ? "green" : "neutral"}>{reward.pointsCost} pts</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!affordable || redeemingId === reward.id}
                    onClick={() => handleRedeem(reward)}
                  >
                    {affordable
                      ? t("redeemButton")
                      : t("redeemMissingPoints", { count: reward.pointsCost - points })}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-mv-border-soft pt-3">
          <p className="text-[12px] font-semibold text-mv-ink-soft">{t("pendingRedemptionsTitle")}</p>
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-mv-green-tint px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-mv-green-dark" />
                <span className="text-[12.5px] font-medium text-mv-green-darker">{r.rewardName}</span>
              </div>
              <span className="font-mono text-[15px] font-semibold tracking-wider text-mv-green-darker">
                {r.code}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function PortalView({
  customer,
  data,
  loyaltyTierThresholds,
}: {
  customer: Customer;
  data: PortalData;
  loyaltyTierThresholds: LoyaltyTierThresholds;
}) {
  const t = useTranslations("portal.view");
  const [programs, setPrograms] = useState<PortalReferralProgress[]>(data.programs);
  const [points, setPoints] = useState(customer.loyaltyPoints);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>(data.redemptions);

  function handleLinkCreated(programId: string, link: CustomerReferralLink) {
    setPrograms((prev) => prev.map((p) => (p.program.id === programId ? { ...p, link } : p)));
  }

  function handleRedeemed(redemption: RewardRedemption) {
    setPoints((prev) => prev - redemption.pointsSpent);
    setRedemptions((prev) => [redemption, ...prev]);
  }

  return (
    <div className="min-h-screen bg-mv-cream px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[16px] font-medium text-mv-ink">
            Flow <span className="text-mv-green-dark">par Minerva</span>
          </span>
        </div>

        <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-mv-green-dark">{t("spaceLabel")}</p>
        <h1 className="mb-6 font-display text-[26px] font-medium text-mv-ink">
          {t("greeting", { name: customer.name })}
        </h1>

        <LoyaltyWalletCard
          points={points}
          visitCount={customer.visitCount}
          totalSpent={customer.totalSpent}
          thresholds={loyaltyTierThresholds}
        />

        <div className="mb-6">
          <RewardsRedeemCard
            rewards={data.rewards}
            points={points}
            redemptions={redemptions}
            onRedeemed={handleRedeemed}
          />
        </div>

        <div className="mb-6">
          <ProfileSettingsCard customer={customer} />
        </div>

        {programs.length > 0 && (
          <div className="mb-6 space-y-4">
            <p className="text-[13px] font-semibold text-mv-ink">{t("referralProgramsTitle")}</p>
            {programs.map(({ program, link }) => (
              <ReferralProgramCard
                key={program.id}
                program={program}
                link={link}
                onLinkCreated={(created) => handleLinkCreated(program.id, created)}
              />
            ))}
          </div>
        )}

        <Card>
          <CardHeader title={t("historyTitle")} description={t("transactionsCount", { count: data.transactions.length })} />
          {data.transactions.length === 0 ? (
            <p className="text-[12.5px] text-mv-ink-faint">{t("noTransactions")}</p>
          ) : (
            <div className="space-y-2">
              {data.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg bg-mv-cream-soft px-3 py-2.5">
                  <div>
                    <p className="text-[12.5px] font-medium text-mv-ink">{t(`txLabel.${tx.type}`)}</p>
                    <p className="text-[11px] text-mv-ink-faint">{formatDate(tx.createdAt)}</p>
                  </div>
                  <span
                    className={
                      tx.pointsDelta >= 0
                        ? "text-[12.5px] font-semibold text-mv-green-dark"
                        : "text-[12.5px] font-semibold text-mv-red"
                    }
                  >
                    {tx.pointsDelta >= 0 ? "+" : ""}
                    {tx.pointsDelta} {t("pts")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
