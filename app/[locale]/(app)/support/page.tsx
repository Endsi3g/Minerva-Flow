"use client";


import { useTranslations, useLocale } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { useApp } from "@/lib/app-context";
import { createSupportRequestAction, getMySupportRequestsAction, submitFeatureFeedbackAction } from "./actions";
import type { SupportCategory, SupportRequest } from "@/lib/data/support";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, HelpCircle, Bug, Lightbulb, MessageCircleQuestion, Vote } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

function buildCategoryLabel(t: (key: string) => string): Record<SupportCategory, string> {
  return {
  bug: t("problem"),
  amelioration: t("improvement"),
  question: "Question",
};
}

const statusTone: Record<SupportRequest["status"], "amber" | "green" | "neutral"> = {
  nouveau: "amber",
  en_cours: "neutral",
  resolu: "green",
};

function buildStatusLabel(t: (key: string) => string): Record<SupportRequest["status"], string> {
  return {
  nouveau: t("sent"),
  en_cours: "En cours",
  resolu: t("resolved"),
};
}

function buildCategories(t: (key: string) => string): { value: SupportCategory; label: string; icon: typeof Bug }[] {
  return [
  { value: "bug", label: t("reportAProblem"), icon: Bug },
  { value: "amelioration", label: t("suggestAnImprovement"), icon: Lightbulb },
  { value: "question", label: t("askAQuestion"), icon: MessageCircleQuestion },
];
}

export default function SupportPage() {
  const locale = useLocale();
  const t = useTranslations("supportPage");
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
        eyebrow={t("settings")}
        title="Aide & Support"
        description={t("reportAProblemSuggest")}
      />

      <div className="mx-auto max-w-2xl w-full space-y-6">
        <Card>
          {sent ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 size={32} className="mb-3 text-mv-green-dark" />
              <p className="font-display text-[16px] font-medium text-mv-ink">{t("messageSent")}</p>
              <p className="mt-1.5 max-w-sm text-[13px] text-mv-ink-soft">
                {t("thankYouWeReceived")}
              </p>
              <Button size="sm" variant="secondary" className="mt-4" onClick={() => setSent(false)}>
                {t("sendAnotherMessage")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Type de demande">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {buildCategories(t).map((c) => (
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
                <Input name="subject" placeholder={t("sumUpYourRequest")} required />
              </Field>

              <Field label="Message">
                <Textarea
                  name="message"
                  placeholder={t("describeTheProblemIdea")}
                  rows={6}
                  required
                />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("sending") : "Envoyer"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <FeatureFeedbackCard restaurantId={restaurantId} />

        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-soft">
              <HelpCircle size={17} />
            </div>
            <div>
              <p className="font-display text-[15px] font-medium text-mv-ink">
                {t("needAHowTo")}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-mv-ink-soft">
                Notre{" "}
                <Link href="/guide" className="text-mv-green-dark underline underline-offset-2">
                  {t("setupGuide")}
                </Link>{" "}
                explique comment prendre en main l&apos;application en quelques minutes.
              </p>
            </div>
          </div>
        </Card>

        {myTickets.length > 0 && (
          <div>
            <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-mv-ink-faint">
              {t("yourPreviousRequests")}
            </p>
            <div className="space-y-2">
              {myTickets.map((ticket) => (
                <Card key={ticket.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{buildCategoryLabel(t)[ticket.category]}</Badge>
                      <Badge tone={statusTone[ticket.status]}>{buildStatusLabel(t)[ticket.status]}</Badge>
                    </div>
                    <span className="text-[12px] text-mv-ink-faint">{formatDate(ticket.createdAt.slice(0, 10), locale)}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-mv-ink">{ticket.subject}</p>
                  <p className="mt-1 text-[12.5px] text-mv-ink-soft">{ticket.message}</p>
                  {ticket.adminReply && (
                    <div className="mt-3 rounded-lg bg-mv-green-tint p-3">
                      <p className="mb-1 text-[12px] font-semibold uppercase text-mv-green-dark">
                        {t("teamReply")}
                      </p>
                      <p className="text-[12.5px] text-mv-ink">{ticket.adminReply}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[12px] text-mv-ink-faint">
          <Link href="/legal/terms" className="underline underline-offset-2 hover:text-mv-ink">
            Conditions d&apos;utilisation
          </Link>{" "}
          ·{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-mv-ink">
            {t("privacyPolicy")}
          </Link>
        </p>
      </div>
    </div>
  );
}

function buildFEATURE_POLL_OPTIONS(t: (key: string) => string) {
  return [
  t("paymentAndOrderingFrom"),
  t("digitalLoyaltyCardApple"),
];
}

/**
 * A quick priority vote + an open-ended suggestion box, sent straight to
 * the team's inbox — separate from the ticket form above (which is for
 * bugs/questions someone follows up on), this is a one-way signal about
 * what to build next.
 */
function FeatureFeedbackCard({ restaurantId }: { restaurantId: string | null }) {
  const t = useTranslations("supportPage");
  const [pollOption, setPollOption] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pollOption && !suggestion.trim()) return;
    setIsSubmitting(true);
    try {
      const ok = await submitFeatureFeedbackAction({
        restaurantId,
        pollOption,
        suggestion: suggestion.trim() || null,
      });
      if (ok) {
        setSent(true);
        setPollOption(null);
        setSuggestion("");
        toast.success(t("thanksForYourFeedback"));
      } else {
        toast.error(t("sendingFailedTryAgain"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
          <Vote size={17} />
        </div>
        <div>
          <p className="font-display text-[15px] font-medium text-mv-ink">{t("helpUsPrioritize")}</p>
          <p className="text-[12.5px] text-mv-ink-soft">{t("whichNextFeatureWould")}</p>
        </div>
      </div>

      {sent ? (
        <div className="flex flex-col items-center py-4 text-center">
          <CheckCircle2 size={26} className="mb-2 text-mv-green-dark" />
          <p className="text-[13px] text-mv-ink-soft">{t("yourFeedbackWasSent")}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setSent(false)}>
            {t("sendMoreFeedback")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            {buildFEATURE_POLL_OPTIONS(t).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPollOption(pollOption === option ? null : option)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[12.5px] font-medium transition-colors ${
                  pollOption === option
                    ? "border-mv-green bg-mv-green-tint text-mv-green-dark"
                    : "border-mv-border text-mv-ink-soft hover:bg-mv-cream-soft"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    pollOption === option ? "border-mv-green bg-mv-green" : "border-mv-border-soft"
                  }`}
                >
                  {pollOption === option && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                {option}
              </button>
            ))}
          </div>

          <Field label="Une suggestion en particulier ?" hint="Optionnel">
            <Textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder={t("describeWhatWouldHelp")}
              rows={3}
            />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSubmitting || (!pollOption && !suggestion.trim())}>
              {isSubmitting ? t("sending") : "Envoyer"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
