"use client";


import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { HelperTooltip } from "@/components/ui/HelperTooltip";
import { FidelisationSubNav } from "@/components/fidelisation/FidelisationSubNav";
import { loyaltyTierOrder, loyaltyTierLabel, loyaltyTierDescription, loyaltyTierBadge, type LoyaltyTierThresholds } from "@/lib/loyalty-tiers";
import { Zap, Coins, Gift, Save } from "lucide-react";
import { useState } from "react";
import { updateRetentionSettingsAction, updateLoyaltyTierThresholdsAction, updateLoyaltyRateAction, updateWelcomeBonusPointsAction, updateAppInstallBonusPointsAction } from "../actions";
import { notifyError } from "@/lib/notify-error";

function LoyaltyRateCard({ restaurantId, initialRate }: { restaurantId: string; initialRate: number }) {
  const t = useTranslations("loyaltySettings");
  const [rate, setRate] = useState(initialRate);

  async function handleBlur() {
    if (rate === initialRate) return;
    await updateLoyaltyRateAction(restaurantId, rate);
  }

  return (
    <Card>
      <CardHeader
        eyebrow={t("points")}
        title={t("earningRate")}
        description={t("pointsAwardedPerDollar")}
      />
      <div className="flex items-center gap-2 text-[12.5px] text-mv-ink-soft">
        <Coins size={13} className="text-mv-green-dark" />
        {t("aCustomerEarns")}
        <input
          type="number"
          min="0"
          step="0.5"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          onBlur={handleBlur}
          className="h-7 w-16 rounded-md border border-mv-border bg-mv-surface px-2 text-center text-[12.5px]"
        />
        {t("pointsPerDollar", { count: rate })}
      </div>
    </Card>
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
  const t = useTranslations("loyaltySettings");
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
        notifyError(t("theUpdateFailed"));
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
        eyebrow={t("automation")}
        title={t("automaticRetention")}
        description={t("reEngagesInactiveCustomers")}
        action={
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isSaving}
            className="data-checked:bg-mv-green"
            aria-label={enabled ? t("turnOffAutomaticRetention") : t("turnOnAutomaticRetention")}
          />
        }
      />
      <div className="flex items-center gap-2 text-[12.5px] text-mv-ink-soft">
        <Zap size={13} className="text-mv-green-dark" />
        {t("considerACustomerInactive")}
        <input
          type="number"
          min="1"
          value={inactivityDays}
          onChange={(e) => setInactivityDays(Number(e.target.value))}
          onBlur={handleInactivityBlur}
          className="h-7 w-16 rounded-md border border-mv-border bg-mv-surface px-2 text-center text-[12.5px]"
        />
        {t("daysWithoutAVisit")}
        <HelperTooltip content={t("aCustomerIsNever")} />
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
  const t = useTranslations("loyaltySettings");
  const [tier2, setTier2] = useState(initialThresholds.tier2);
  const [tier3, setTier3] = useState(initialThresholds.tier3);

  async function handleBlur(patch: { tier2?: number; tier3?: number }) {
    await updateLoyaltyTierThresholdsAction(restaurantId, patch);
  }

  return (
    <Card>
      <CardHeader
        eyebrow={t("customerStatus")}
        title={
          <span className="flex items-center gap-1.5">
            {t("loyaltyTiers")}
            <HelperTooltip content={t("theThresholdIsThe")} />
          </span>
        }
        description={t("aPremiumProgressionInstead")}
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
              <p className="mt-2 text-[12px] leading-snug text-mv-ink-faint">{loyaltyTierDescription[tier]}</p>
              <p className="mt-2 text-[12px] text-mv-ink-soft">
                {i === 0 ? (
                  t("fromSignUp")
                ) : (
                  <>
                    {t("fromAmount")}{" "}
                    <input
                      type="number"
                      min="0"
                      value={i === 1 ? tier2 : tier3}
                      onChange={(e) => (i === 1 ? setTier2(Number(e.target.value)) : setTier3(Number(e.target.value)))}
                      onBlur={() => handleBlur(i === 1 ? { tier2 } : { tier3 })}
                      className="h-7 w-20 rounded-md border border-mv-border bg-mv-surface px-2 text-center text-[12px]"
                    />{" "}
                    {t("dollarsSpent")}
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

export function ParametresView({
  restaurantId,
  loyaltyPointsPerDollar,
  welcomeBonusPoints,
  appInstallBonusPoints,
  loyaltyTierThresholds,
  retentionEngineEnabled,
  retentionInactivityDays,
}: {
  restaurantId: string | null;
  loyaltyPointsPerDollar: number;
  welcomeBonusPoints: number;
  appInstallBonusPoints: number;
  loyaltyTierThresholds: LoyaltyTierThresholds;
  retentionEngineEnabled: boolean;
  retentionInactivityDays: number;
}) {
  const t = useTranslations("loyaltySettings");
  return (
    <div>
      <FidelisationSubNav />
      <PageHeader
        eyebrow={t("setup")}
        title={t("settings")}
        description={t("pointRateLoyaltyTiers")}
      />
      {restaurantId && (
        <div className="space-y-6">
          <LoyaltyRateCard restaurantId={restaurantId} initialRate={loyaltyPointsPerDollar} />
          <WelcomeBonusCard restaurantId={restaurantId} initialPoints={welcomeBonusPoints} />
          <AppInstallBonusCard restaurantId={restaurantId} initialPoints={appInstallBonusPoints} />
          <LoyaltyTierSettingsCard restaurantId={restaurantId} initialThresholds={loyaltyTierThresholds} />
          <RetentionSettingsCard
            restaurantId={restaurantId}
            initialEnabled={retentionEngineEnabled}
            initialInactivityDays={retentionInactivityDays}
          />
        </div>
      )}
    </div>
  );
}

function AppInstallBonusCard({ restaurantId, initialPoints }: { restaurantId: string; initialPoints: number }) {
  const t = useTranslations("loyaltySettings");
  const [points, setPoints] = useState(initialPoints);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save() {
    setSaving(true);
    setSaved(false);
    const ok = await updateAppInstallBonusPointsAction(restaurantId, points);
    setSaving(false);
    if (!ok) { notifyError(t("theBonusCouldNot")); return; }
    setSaved(true);
  }
  return <Card>
    <CardHeader eyebrow={t("mobileApp")} title={t("appInstallBonus")} description={t("optionalYourCustomersReceive")} />
    <div className="flex flex-wrap items-center gap-3 text-[14px] text-mv-ink-soft">
      <Gift size={16} className="text-mv-green-dark" aria-hidden="true" />
      <label className="flex items-center gap-2">Points offerts
        <input type="number" min="0" max="500" step="1" value={points} onChange={(event) => { setPoints(Math.min(500, Math.max(0, Math.round(Number(event.target.value) || 0)))); setSaved(false); }} className="h-12 w-28 rounded-lg border border-mv-border bg-mv-surface px-3 text-[16px] text-mv-ink" />
      </label>
      <button type="button" onClick={save} disabled={saving} className="inline-flex h-12 items-center gap-2 rounded-lg bg-mv-green px-4 text-[14px] font-semibold text-white hover:bg-mv-green-dark disabled:opacity-60">{saving ? t("saving") : t("save")}</button>
      {saved && <span role="status" className="text-[14px] font-medium text-mv-green-dark">{t("saved")}</span>}
      <p className="basis-full text-[12px] leading-5 text-mv-ink-faint">{t("at0PointsThe")}</p>
    </div>
  </Card>;
}

function WelcomeBonusCard({ restaurantId, initialPoints }: { restaurantId: string; initialPoints: number }) {
  const t = useTranslations("loyaltySettings");
  const [points, setPoints] = useState(initialPoints);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save() {
    setSaving(true);
    setSaved(false);
    const ok = await updateWelcomeBonusPointsAction(restaurantId, points);
    setSaving(false);
    if (!ok) { notifyError(t("theBonusCouldNot")); return; }
    setSaved(true);
  }
  return <Card>
    <CardHeader eyebrow={t("customerWelcome")} title={t("firstVisitBonus")} description={t("optionalItIsCredited")} />
    <div className="flex flex-wrap items-center gap-3 text-[13px] text-mv-ink-soft">
      <Gift size={16} className="text-mv-green-dark" />
      <label className="flex items-center gap-2">Points offerts
        <input type="number" min="0" max="100000" step="1" value={points} onChange={(event) => { setPoints(Math.max(0, Number(event.target.value) || 0)); setSaved(false); }} className="h-9 w-28 rounded-lg border border-mv-border bg-mv-surface px-3 text-center" />
      </label>
      <button type="button" onClick={save} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-mv-green px-3 text-xs font-semibold text-white disabled:opacity-60"><Save size={13} />{saving ? t("saving") : t("save")}</button>
      {saved && <span role="status" className="text-xs font-medium text-mv-green-dark">{t("saved")}</span>}
      <p className="basis-full text-[12px] leading-5 text-mv-ink-faint">{t("at0PointsThe2")}</p>
    </div>
  </Card>;
}
