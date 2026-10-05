"use client";


import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Megaphone, CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/minerva/FormField";
import { useApp } from "@/lib/app-context";
import { submitPaidAdsRequestAction } from "./actions";
import type { PaidAdsBudgetRange, PaidAdsVolumeEstimate, PaidAdsTimeframe, PaidAdsRequest } from "@/lib/data/paid-ads-requests";

function buildBUDGET_LABELS(t: (key: string) => string): Record<PaidAdsBudgetRange, string> {
  return {
  under_500: t("under500Month"),
  "500_1500": t("500To1500"),
  "1500_5000": t("1500To5"),
  over_5000: t("over5000Month"),
  not_sure: t("iDonTKnow"),
};
}

function buildVOLUME_LABELS(t: (key: string) => string): Record<PaidAdsVolumeEstimate, string> {
  return {
  under_50: t("under50CoversPer"),
  "50_150": t("50To150Covers"),
  "150_400": t("150To400Covers"),
  over_400: t("over400CoversPer"),
  not_sure: t("iDonTKnow2"),
};
}

function buildTIMEFRAME_LABELS(t: (key: string) => string): Record<PaidAdsTimeframe, string> {
  return {
  immediately: t("asSoonAsPossible"),
  this_month: "Ce mois-ci",
  exploring: t("stillExploringTheIdea"),
};
}

function buildSTATUS_LABELS(t: (key: string) => string): Record<PaidAdsRequest["status"], string> {
  return {
  nouveau: t("receivedOurTeamWill"),
  contacte: t("inDiscussionWithOur"),
  ferme: t("finished"),
};
}

function buildSTEPS(t: (key: string) => string) {
  return [t("yourRestaurant"), t("yourContactDetails"), t("yourGoals")] as const;
}

export function PaidAdsRequestCard({ restaurantId, canManage, initialRequest }: {
  restaurantId: string | null;
  canManage: boolean;
  initialRequest: PaidAdsRequest | null;
}) {
  const t = useTranslations("paidAdsRequest");
  const { authUser } = useApp();
  const [request, setRequest] = useState(initialRequest);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [weeklyVolumeEstimate, setWeeklyVolumeEstimate] = useState<PaidAdsVolumeEstimate>("not_sure");
  const [budget, setBudget] = useState<PaidAdsBudgetRange>("not_sure");
  const [contactName, setContactName] = useState(authUser?.fullName ?? "");
  const [contactEmail, setContactEmail] = useState(authUser?.email ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [hasRunPaidAdsBefore, setHasRunPaidAdsBefore] = useState(false);
  const [desiredStartTimeframe, setDesiredStartTimeframe] = useState<PaidAdsTimeframe>("exploring");
  const [goals, setGoals] = useState("");

  const stepValid = [
    true, // step 0's fields (volume/budget) always have a valid default
    contactName.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()),
    goals.trim().length > 0,
  ];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!restaurantId || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await submitPaidAdsRequestAction(restaurantId, {
      contactName, contactEmail, contactPhone, monthlyBudgetRange: budget,
      weeklyVolumeEstimate, hasRunPaidAdsBefore, desiredStartTimeframe, goals,
    });
    setSubmitting(false);
    if (result.ok && result.request) {
      setRequest(result.request);
    } else if (result.error === "already_open" && result.request) {
      setRequest(result.request);
    } else if (result.error === "invalid") {
      setError(t("checkYourNameA"));
    } else {
      setError(t("theRequestCouldNot"));
    }
  }

  return (
    <Card className="border-mv-green/25 bg-mv-green/[0.04] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mv-green/10 text-mv-green-dark">
          <Megaphone size={19} />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-mv-ink">{t("needTrafficNotJust")}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mv-ink-soft">
            {t("trafficExplainer")}
          </p>
        </div>
      </div>

      {!canManage ? (
        <p className="mt-4 rounded-lg bg-mv-cream-soft p-3 text-[12.5px] text-mv-ink-soft">
          {t("thisRequestIsReserved")}
        </p>
      ) : request ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-mv-green/20 bg-mv-surface p-3 text-[12.5px] text-mv-ink-soft">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-mv-green-dark" />
          <span>{buildSTATUS_LABELS(t)[request.status]}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            {buildSTEPS(t).map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${i <= step ? "bg-mv-green text-white" : "bg-mv-cream-soft text-mv-ink-faint"}`}>
                  {i + 1}
                </span>
                <span className={`text-[12px] font-medium ${i === step ? "text-mv-ink" : "text-mv-ink-faint"}`}>{label}</span>
                {i < buildSTEPS(t).length - 1 && <span className="h-px flex-1 bg-mv-border" />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Volume hebdomadaire approximatif" hint={t("helpsUsAssessYour")}>
                <Select value={weeklyVolumeEstimate} onChange={(e) => setWeeklyVolumeEstimate(e.target.value as PaidAdsVolumeEstimate)}>
                  {(Object.keys(buildVOLUME_LABELS(t)) as PaidAdsVolumeEstimate[]).map((key) => <option key={key} value={key}>{buildVOLUME_LABELS(t)[key]}</option>)}
                </Select>
              </Field>
              <Field label="Budget publicitaire approximatif" hint={t("aRangeIsEnough")}>
                <Select value={budget} onChange={(e) => setBudget(e.target.value as PaidAdsBudgetRange)}>
                  {(Object.keys(buildBUDGET_LABELS(t)) as PaidAdsBudgetRange[]).map((key) => <option key={key} value={key}>{buildBUDGET_LABELS(t)[key]}</option>)}
                </Select>
              </Field>
              <Field label={t("haveYouAlreadyRun")}>
                <Select value={hasRunPaidAdsBefore ? "yes" : "no"} onChange={(e) => setHasRunPaidAdsBefore(e.target.value === "yes")}>
                  <option value="no">{t("noThisWouldBe")}</option>
                  <option value="yes">{t("yesAlreadyTried")}</option>
                </Select>
              </Field>
              <Field label={t("whenWouldYouLike")} hint={t("urgentRequestsMoveUp")}>
                <Select value={desiredStartTimeframe} onChange={(e) => setDesiredStartTimeframe(e.target.value as PaidAdsTimeframe)}>
                  {(Object.keys(buildTIMEFRAME_LABELS(t)) as PaidAdsTimeframe[]).map((key) => <option key={key} value={key}>{buildTIMEFRAME_LABELS(t)[key]}</option>)}
                </Select>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Votre nom"><Input value={contactName} onChange={(e) => setContactName(e.target.value)} required /></Field>
              <Field label="Courriel"><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required /></Field>
              <Field label={t("phoneOptional")}><Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></Field>
            </div>
          )}

          {step === 2 && (
            <Field label="Vos objectifs" hint={t("eGMoreReservations")}>
              <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={4} required maxLength={2000} />
            </Field>
          )}

          {error && <p className="mt-3 text-[12.5px] text-mv-red">{error}</p>}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[12px] text-mv-ink-faint">
              <Info size={13} className="shrink-0" />
              <span>{t("yourAnswersStayInternal")}</span>
            </div>
            <div className="flex shrink-0 gap-2">
              {step > 0 && <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>{t("back")}</Button>}
              {step < buildSTEPS(t).length - 1 ? (
                <Button type="button" disabled={!stepValid[step]} onClick={() => setStep((s) => s + 1)}>{t("continue")}</Button>
              ) : (
                <Button type="submit" disabled={submitting || !restaurantId || !stepValid[2]}>{submitting ? t("sending") : t("sendTheRequest")}</Button>
              )}
            </div>
          </div>
        </form>
      )}
    </Card>
  );
}
