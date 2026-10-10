"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import posthog from "posthog-js";
import { Star, X } from "lucide-react";

const DONE_AT_KEY = "mv_onboarding_done_at";
const ANSWERED_KEY = "mv_experience_prompt_done";
const DELAY_MS = 30 * 60_000;

const COPY = {
  fr: {
    title: "Comment se passe votre début ?",
    body: "Notez Minerva Flow : ça nous aide à l'améliorer pour vous.",
    commentPlaceholder: "Qu'est-ce qui manque ou vous freine ? (facultatif)",
    send: "Envoyer",
    thanks: "Merci, c'est noté.",
    close: "Fermer",
    star: (n: number) => `${n} sur 5`,
  },
  en: {
    title: "How is your start going?",
    body: "Rate Minerva Flow: it helps us improve it for you.",
    commentPlaceholder: "What is missing or in your way? (optional)",
    send: "Send",
    thanks: "Thanks, noted.",
    close: "Close",
    star: (n: number) => `${n} out of 5`,
  },
} as const;

function readNumber(key: string): number | null {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Asks a new owner for a quick rating 30 minutes after finishing onboarding
 * (the moment is recorded by the wizard). One question, asked once: answering
 * or closing it stores a flag. The rating goes to analytics, never to a
 * public review site.
 */
export function OwnerExperiencePrompt() {
  const lang = useLocale() === "en" ? "en" : "fr";
  const t = COPY[lang];
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let answered = false;
    try {
      answered = window.localStorage.getItem(ANSWERED_KEY) === "1";
    } catch {
      return;
    }
    const doneAt = readNumber(DONE_AT_KEY);
    if (answered || !doneAt) return;
    const wait = Math.max(0, doneAt + DELAY_MS - Date.now());
    const timer = window.setTimeout(() => {
      setVisible(true);
      posthog.capture("owner_experience_prompt_shown");
    }, wait);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(ANSWERED_KEY, "1");
    } catch {
      // storage unavailable: the prompt may reappear next visit, which is acceptable
    }
    setVisible(false);
  }

  function submit() {
    if (!rating) return;
    posthog.capture("owner_experience_rated", { rating, comment: comment.trim().slice(0, 500) || undefined });
    setSent(true);
    window.setTimeout(dismiss, 1800);
  }

  if (!visible) return null;
  return (
    <div role="dialog" aria-label={t.title} className="fixed bottom-24 right-4 z-50 w-[min(92vw,340px)] rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-lg md:bottom-6">
      <button type="button" onClick={dismiss} aria-label={t.close} className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-mv-ink-soft hover:bg-mv-ink/5">
        <X size={16} />
      </button>
      {sent ? (
        <p className="pr-6 text-[14px] font-medium text-mv-ink">{t.thanks}</p>
      ) : (
        <>
          <p className="pr-6 font-display text-[17px] font-medium text-mv-ink">{t.title}</p>
          <p className="mt-1 text-[12.5px] text-mv-ink-soft">{t.body}</p>
          <div className="mt-3 flex gap-1" role="radiogroup" aria-label={t.title}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={t.star(n)}
                onClick={() => setRating(n)}
                className="flex size-9 items-center justify-center rounded-lg hover:bg-mv-ink/5 focus-visible:outline-2 focus-visible:outline-mv-green"
              >
                <Star size={22} className={n <= rating ? "fill-mv-green text-mv-green" : "text-mv-ink-faint"} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t.commentPlaceholder}
                rows={2}
                className="mt-3 w-full resize-none rounded-lg border border-mv-border bg-mv-cream-soft p-2.5 text-[13px] text-mv-ink focus:border-mv-green focus:outline-none"
              />
              <button type="button" onClick={submit} className="mt-2 h-10 w-full rounded-lg bg-mv-green text-[13px] font-semibold text-white hover:bg-mv-green-dark">
                {t.send}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
