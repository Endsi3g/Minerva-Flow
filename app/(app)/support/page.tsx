"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { useApp } from "@/lib/app-context";
import { createSupportRequestAction, getMySupportRequestsAction } from "./actions";
import type { SupportCategory, SupportRequest } from "@/lib/data/support";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, HelpCircle, Bug, Lightbulb, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

const categoryLabel: Record<SupportCategory, string> = {
  bug: "Problème",
  amelioration: "Amélioration",
  question: "Question",
};

const statusTone: Record<SupportRequest["status"], "amber" | "green" | "neutral"> = {
  nouveau: "amber",
  en_cours: "neutral",
  resolu: "green",
};

const statusLabel: Record<SupportRequest["status"], string> = {
  nouveau: "Envoyé",
  en_cours: "En cours",
  resolu: "Résolu",
};

const categories: { value: SupportCategory; label: string; icon: typeof Bug }[] = [
  { value: "bug", label: "Signaler un problème", icon: Bug },
  { value: "amelioration", label: "Proposer une amélioration", icon: Lightbulb },
  { value: "question", label: "Poser une question", icon: MessageCircleQuestion },
];

export default function SupportPage() {
  const { restaurantId } = useApp();
  const [category, setCategory] = useState<SupportCategory>("bug");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [myTickets, setMyTickets] = useState<SupportRequest[]>([]);

  useEffect(() => {
    getMySupportRequestsAction().then(setMyTickets);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const ok = await createSupportRequestAction({
        restaurantId,
        category,
        subject: String(form.get("subject") ?? ""),
        message: String(form.get("message") ?? ""),
      });
      if (ok) {
        setSent(true);
        getMySupportRequestsAction().then(setMyTickets);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Paramètres"
        title="Aide & Support"
        description="Signalez un problème, proposez une amélioration ou posez-nous une question — on lit tout."
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          {sent ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 size={32} className="mb-3 text-mv-green-dark" />
              <p className="font-display text-[16px] font-medium text-mv-ink">Message envoyé</p>
              <p className="mt-1.5 max-w-sm text-[13px] text-mv-ink-soft">
                Merci ! Nous avons bien reçu votre message et le traiterons dès que possible.
              </p>
              <Button size="sm" variant="secondary" className="mt-4" onClick={() => setSent(false)}>
                Envoyer un autre message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Type de demande">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {categories.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-center text-[12.5px] font-medium transition-colors ${
                        category === c.value
                          ? "border-mv-green bg-mv-green-tint text-mv-green-dark"
                          : "border-mv-border text-mv-ink-soft hover:bg-mv-cream-soft"
                      }`}
                    >
                      <c.icon size={16} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Sujet">
                <Input name="subject" placeholder="Résumez votre demande en quelques mots" required />
              </Field>

              <Field label="Message">
                <Textarea
                  name="message"
                  placeholder="Décrivez le problème, l'idée ou la question — le plus de détails possible nous aide à répondre vite."
                  rows={6}
                  required
                />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Envoi…" : "Envoyer"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-soft">
              <HelpCircle size={17} />
            </div>
            <div>
              <p className="font-display text-[15px] font-medium text-mv-ink">
                Besoin d&apos;un mode d&apos;emploi ?
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-mv-ink-soft">
                Notre{" "}
                <Link href="/guide" className="text-mv-green-dark underline underline-offset-2">
                  guide de configuration
                </Link>{" "}
                explique comment prendre en main l&apos;application en quelques minutes.
              </p>
            </div>
          </div>
        </Card>

        {myTickets.length > 0 && (
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint">
              Vos demandes précédentes
            </p>
            <div className="space-y-2">
              {myTickets.map((t) => (
                <Card key={t.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{categoryLabel[t.category]}</Badge>
                      <Badge tone={statusTone[t.status]}>{statusLabel[t.status]}</Badge>
                    </div>
                    <span className="text-[11px] text-mv-ink-faint">{formatDate(t.createdAt.slice(0, 10))}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-mv-ink">{t.subject}</p>
                  <p className="mt-1 text-[12.5px] text-mv-ink-soft">{t.message}</p>
                  {t.adminReply && (
                    <div className="mt-3 rounded-lg bg-mv-green-tint p-3">
                      <p className="mb-1 text-[10.5px] font-semibold uppercase text-mv-green-dark">
                        Réponse de l&apos;équipe
                      </p>
                      <p className="text-[12.5px] text-mv-ink">{t.adminReply}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[11.5px] text-mv-ink-faint">
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-mv-ink">
            Conditions d&apos;utilisation
          </Link>{" "}
          ·{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-mv-ink">
            Politique de confidentialité
          </Link>
        </p>
      </div>
    </div>
  );
}
