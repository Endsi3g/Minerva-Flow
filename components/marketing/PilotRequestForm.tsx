"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { requestPilotAccessAction } from "@/app/pilot-actions";
import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";

export function PilotRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const ok = await requestPilotAccessAction({
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        restaurantName: String(form.get("restaurantName") ?? ""),
        city: String(form.get("city") ?? ""),
        message: String(form.get("message") ?? ""),
      });
      if (ok) setSent(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-mv-border bg-mv-surface p-8 text-center">
        <CheckCircle2 size={30} className="text-mv-green-dark" />
        <p className="font-display text-[17px] font-medium text-mv-ink">Demande envoyée</p>
        <p className="max-w-sm text-[13px] text-mv-ink-soft">
          Merci ! On vous contacte personnellement d&apos;ici quelques jours pour configurer votre accès.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-mv-border bg-mv-surface p-6 shadow-mv-md sm:grid-cols-2"
    >
      <Field label="Votre nom">
        <Input name="fullName" placeholder="Prénom et nom" required />
      </Field>
      <Field label="Courriel">
        <Input name="email" type="email" placeholder="vous@restaurant.ca" required />
      </Field>
      <Field label="Nom de l'établissement">
        <Input name="restaurantName" placeholder="Ex : Café du Coin" required />
      </Field>
      <Field label="Ville">
        <Input name="city" placeholder="Ex : Montréal" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Un mot sur votre situation" hint="Optionnel">
          <Textarea name="message" rows={3} placeholder="Ce que vous utilisez aujourd'hui, ce que vous cherchez…" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Envoi…" : "Demander un accès pilote"}
        </Button>
      </div>
    </form>
  );
}
