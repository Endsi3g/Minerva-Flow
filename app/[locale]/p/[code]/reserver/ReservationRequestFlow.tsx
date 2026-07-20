"use client";

import { useState, type FormEvent } from "react";
import { LogoMark } from "@/components/shell/Logo";
import { Card } from "@/components/minerva/PageCard";
import { Field, Input } from "@/components/minerva/FormField";
import { Button } from "@/components/ui/Button";
import { requestCustomerMagicLink } from "@/lib/auth/customer-magic-link";
import { submitReservationRequestAction } from "./actions";
import { Mail, CheckCircle2 } from "lucide-react";

export function ReservationRequestFlow({
  code,
  restaurantName,
  authenticated,
}: {
  code: string;
  restaurantName: string;
  authenticated: boolean;
}) {
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailStatus("sending");
    const result = await requestCustomerMagicLink(email, `/p/${code}/reserver`);
    if (result.ok) {
      setEmailStatus("sent");
    } else {
      setEmailStatus("error");
      setEmailError(result.error ?? "Une erreur est survenue.");
    }
  }

  async function handleReservationSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitStatus("submitting");
    const ok = await submitReservationRequestAction(code, {
      guestName: String(form.get("guestName") ?? ""),
      guestPhone: String(form.get("guestPhone") ?? "") || null,
      partySize: Number(form.get("partySize") ?? 2),
      reservationTime: String(form.get("reservationTime") ?? ""),
    });
    if (ok) {
      setSubmitStatus("done");
    } else {
      setSubmitStatus("error");
      setSubmitError("La demande a échoué. Réessayez.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mv-cream px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <LogoMark size={28} />
          <span className="font-sans text-[16px] font-medium text-mv-ink">
            Flow <span className="text-mv-green-dark">par Minerva</span>
          </span>
        </div>
        <Card>
          {submitStatus === "done" ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                <CheckCircle2 size={18} />
              </div>
              <p className="font-display text-[17px] font-medium text-mv-ink">Demande envoyée</p>
              <p className="mt-1.5 text-[13px] text-mv-ink-soft">
                {restaurantName} confirmera votre réservation sous peu.
              </p>
            </div>
          ) : authenticated ? (
            <form onSubmit={handleReservationSubmit} className="space-y-3">
              <div className="text-center">
                <p className="font-display text-[17px] font-medium text-mv-ink">Réserver chez {restaurantName}</p>
              </div>
              <Field label="Nom">
                <Input name="guestName" required autoFocus />
              </Field>
              <Field label="Téléphone" hint="Optionnel">
                <Input name="guestPhone" type="tel" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Personnes">
                  <Input name="partySize" type="number" min="1" defaultValue="2" required />
                </Field>
                <Field label="Date et heure">
                  <Input name="reservationTime" type="datetime-local" required />
                </Field>
              </div>
              {submitStatus === "error" && <p className="text-[12.5px] text-mv-red">{submitError}</p>}
              <Button type="submit" disabled={submitStatus === "submitting"} className="w-full">
                {submitStatus === "submitting" ? "Envoi…" : "Envoyer la demande"}
              </Button>
            </form>
          ) : emailStatus === "sent" ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
                <Mail size={18} />
              </div>
              <p className="font-display text-[17px] font-medium text-mv-ink">Vérifiez vos courriels</p>
              <p className="mt-1.5 text-[13px] text-mv-ink-soft">
                Cliquez le lien reçu à {email} pour continuer votre réservation.
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="text-center">
                <p className="font-display text-[17px] font-medium text-mv-ink">Réserver chez {restaurantName}</p>
                <p className="mt-1 text-[13px] text-mv-ink-soft">Entrez votre courriel pour commencer.</p>
              </div>
              <Field label="Courriel">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              {emailStatus === "error" && <p className="text-[12.5px] text-mv-red">{emailError}</p>}
              <Button type="submit" disabled={emailStatus === "sending"} className="w-full">
                {emailStatus === "sending" ? "Envoi…" : "Continuer"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
