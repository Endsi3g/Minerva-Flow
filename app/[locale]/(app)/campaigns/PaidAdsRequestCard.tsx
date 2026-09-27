"use client";

import { useState, type FormEvent } from "react";
import { Megaphone, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/minerva/FormField";
import { useApp } from "@/lib/app-context";
import { submitPaidAdsRequestAction } from "./actions";
import type { PaidAdsBudgetRange, PaidAdsRequest } from "@/lib/data/paid-ads-requests";

const BUDGET_LABELS: Record<PaidAdsBudgetRange, string> = {
  under_500: "Moins de 500 $ / mois",
  "500_1500": "500 $ à 1 500 $ / mois",
  "1500_5000": "1 500 $ à 5 000 $ / mois",
  over_5000: "Plus de 5 000 $ / mois",
  not_sure: "Je ne sais pas encore",
};

const STATUS_LABELS: Record<PaidAdsRequest["status"], string> = {
  nouveau: "Reçue — notre équipe vous contactera sous peu.",
  contacte: "En discussion avec notre équipe.",
  ferme: "Terminée.",
};

export function PaidAdsRequestCard({ restaurantId, canManage, initialRequest }: {
  restaurantId: string | null;
  canManage: boolean;
  initialRequest: PaidAdsRequest | null;
}) {
  const { authUser } = useApp();
  const [request, setRequest] = useState(initialRequest);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactName, setContactName] = useState(authUser?.fullName ?? "");
  const [contactEmail, setContactEmail] = useState(authUser?.email ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [budget, setBudget] = useState<PaidAdsBudgetRange>("not_sure");
  const [goals, setGoals] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!restaurantId || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await submitPaidAdsRequestAction(restaurantId, { contactName, contactEmail, contactPhone, monthlyBudgetRange: budget, goals });
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
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Votre nom"><Input value={contactName} onChange={(e) => setContactName(e.target.value)} required /></Field>
          <Field label="Courriel"><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required /></Field>
          <Field label="Téléphone · facultatif"><Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></Field>
          <Field label="Budget publicitaire approximatif">
            <Select value={budget} onChange={(e) => setBudget(e.target.value as PaidAdsBudgetRange)}>
              {(Object.keys(BUDGET_LABELS) as PaidAdsBudgetRange[]).map((key) => (
                <option key={key} value={key}>{BUDGET_LABELS[key]}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Vos objectifs" hint="Ex. plus de réservations le mardi midi, lancement d’un nouveau menu, zone à cibler…">
              <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} required maxLength={2000} />
            </Field>
          </div>
          {error && <p className="sm:col-span-2 text-[12.5px] text-mv-red">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting || !restaurantId}>{submitting ? "Envoi…" : "Envoyer la demande"}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
