"use client";

import { useState, type FormEvent } from "react";
import { Megaphone, CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/minerva/FormField";
import { useApp } from "@/lib/app-context";
import { submitPaidAdsRequestAction } from "./actions";
import type { PaidAdsBudgetRange, PaidAdsVolumeEstimate, PaidAdsTimeframe, PaidAdsRequest } from "@/lib/data/paid-ads-requests";

const BUDGET_LABELS: Record<PaidAdsBudgetRange, string> = {
  under_500: "Moins de 500 $ / mois",
  "500_1500": "500 $ à 1 500 $ / mois",
  "1500_5000": "1 500 $ à 5 000 $ / mois",
  over_5000: "Plus de 5 000 $ / mois",
  not_sure: "Je ne sais pas encore",
};

const VOLUME_LABELS: Record<PaidAdsVolumeEstimate, string> = {
  under_50: "Moins de 50 couverts par semaine",
  "50_150": "50 à 150 couverts par semaine",
  "150_400": "150 à 400 couverts par semaine",
  over_400: "Plus de 400 couverts par semaine",
  not_sure: "Je ne sais pas / ça varie beaucoup",
};

const TIMEFRAME_LABELS: Record<PaidAdsTimeframe, string> = {
  immediately: "Dès que possible",
  this_month: "Ce mois-ci",
  exploring: "J’explore encore l’idée",
};

const STATUS_LABELS: Record<PaidAdsRequest["status"], string> = {
  nouveau: "Reçue — notre équipe vous contactera sous peu.",
  contacte: "En discussion avec notre équipe.",
  ferme: "Terminée.",
};

const STEPS = ["Votre restaurant", "Vos coordonnées", "Vos objectifs"] as const;

export function PaidAdsRequestCard({ restaurantId, canManage, initialRequest }: {
  restaurantId: string | null;
  canManage: boolean;
  initialRequest: PaidAdsRequest | null;
}) {
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
      setError("Vérifiez votre nom, un courriel valide et vos objectifs, puis réessayez.");
    } else {
      setError("La demande n’a pas pu être envoyée. Réessayez dans un instant.");
    }
  }

  return (
    <Card className="border-mv-green/25 bg-mv-green/[0.04] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mv-green/10 text-mv-green-dark">
          <Megaphone size={19} />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-mv-ink">Besoin de trafic, pas seulement d’outils ?</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mv-ink-soft">
            Les automatisations et le studio visuel ci-dessus amplifient les clients que votre restaurant attire déjà —
            ils ne créent pas de nouveaux clients à eux seuls. Sans trafic (bouche-à-oreille, passage, visibilité locale),
            l’effet de la fidélisation reste limité. Notre équipe peut mettre en place et gérer vos campagnes publicitaires
            payantes (Meta, Google) pour vous; les frais de gestion sont déterminés selon vos besoins, pas un forfait fixe.
          </p>
        </div>
      </div>

      {!canManage ? (
        <p className="mt-4 rounded-lg bg-mv-cream-soft p-3 text-[12.5px] text-mv-ink-soft">
          Cette demande est réservée aux propriétaires et gestionnaires.
        </p>
      ) : request ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-mv-green/20 bg-mv-surface p-3 text-[12.5px] text-mv-ink-soft">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-mv-green-dark" />
          <span>{STATUS_LABELS[request.status]}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="mb-4 flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i <= step ? "bg-mv-green text-white" : "bg-mv-cream-soft text-mv-ink-faint"}`}>
                  {i + 1}
                </span>
                <span className={`text-[11.5px] font-medium ${i === step ? "text-mv-ink" : "text-mv-ink-faint"}`}>{label}</span>
                {i < STEPS.length - 1 && <span className="h-px flex-1 bg-mv-border" />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Volume hebdomadaire approximatif" hint="Nous aide à évaluer la capacité de votre restaurant à absorber du nouveau trafic dès maintenant.">
                <Select value={weeklyVolumeEstimate} onChange={(e) => setWeeklyVolumeEstimate(e.target.value as PaidAdsVolumeEstimate)}>
                  {(Object.keys(VOLUME_LABELS) as PaidAdsVolumeEstimate[]).map((key) => <option key={key} value={key}>{VOLUME_LABELS[key]}</option>)}
                </Select>
              </Field>
              <Field label="Budget publicitaire approximatif" hint="Une fourchette suffit — ça oriente le type de campagne qu'on vous proposera.">
                <Select value={budget} onChange={(e) => setBudget(e.target.value as PaidAdsBudgetRange)}>
                  {(Object.keys(BUDGET_LABELS) as PaidAdsBudgetRange[]).map((key) => <option key={key} value={key}>{BUDGET_LABELS[key]}</option>)}
                </Select>
              </Field>
              <Field label="Avez-vous déjà fait de la publicité payante ?">
                <Select value={hasRunPaidAdsBefore ? "yes" : "no"} onChange={(e) => setHasRunPaidAdsBefore(e.target.value === "yes")}>
                  <option value="no">Non, ce serait une première</option>
                  <option value="yes">Oui, déjà essayé</option>
                </Select>
              </Field>
              <Field label="Quand souhaitez-vous démarrer ?" hint="Les demandes urgentes remontent en priorité dans notre file.">
                <Select value={desiredStartTimeframe} onChange={(e) => setDesiredStartTimeframe(e.target.value as PaidAdsTimeframe)}>
                  {(Object.keys(TIMEFRAME_LABELS) as PaidAdsTimeframe[]).map((key) => <option key={key} value={key}>{TIMEFRAME_LABELS[key]}</option>)}
                </Select>
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Votre nom"><Input value={contactName} onChange={(e) => setContactName(e.target.value)} required /></Field>
              <Field label="Courriel"><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required /></Field>
              <Field label="Téléphone · facultatif"><Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></Field>
            </div>
          )}

          {step === 2 && (
            <Field label="Vos objectifs" hint="Ex. plus de réservations le mardi midi, lancement d’un nouveau menu, zone à cibler… Plus c’est précis, plus vite on peut vous répondre avec une proposition pertinente.">
              <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={4} required maxLength={2000} />
            </Field>
          )}

          {error && <p className="mt-3 text-[12.5px] text-mv-red">{error}</p>}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-mv-ink-faint">
              <Info size={13} className="shrink-0" />
              <span>Vos réponses restent internes — elles servent uniquement à préparer votre suivi.</span>
            </div>
            <div className="flex shrink-0 gap-2">
              {step > 0 && <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>Retour</Button>}
              {step < STEPS.length - 1 ? (
                <Button type="button" disabled={!stepValid[step]} onClick={() => setStep((s) => s + 1)}>Continuer</Button>
              ) : (
                <Button type="submit" disabled={submitting || !restaurantId || !stepValid[2]}>{submitting ? "Envoi…" : "Envoyer la demande"}</Button>
              )}
            </div>
          </div>
        </form>
      )}
    </Card>
  );
}
