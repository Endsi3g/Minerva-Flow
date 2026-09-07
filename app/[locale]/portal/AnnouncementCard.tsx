"use client";

import { useState, useEffect } from "react";
import { Sparkles, Check, Send, X, MessageSquareHeart } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { PlatformAnnouncement } from "@/lib/types";

export function AnnouncementCard({
  announcement,
  customerId,
}: {
  announcement: PlatformAnnouncement;
  customerId: string;
}) {
  const t = useTranslations("announcements");
  const [dismissed, setDismissed] = useState(true); // default true until localstorage is checked
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(`announcement_dismissed_${announcement.id}`);
    const savedVote = localStorage.getItem(`announcement_voted_${announcement.id}`);
    if (!isDismissed) {
      setDismissed(false);
    }
    if (savedVote) {
      setSelectedOption(savedVote);
      setFeedbackSent(true);
    }
  }, [announcement.id]);

  function handleDismiss() {
    localStorage.setItem(`announcement_dismissed_${announcement.id}`, "true");
    setDismissed(true);
  }

  async function handleVote(option: string) {
    if (selectedOption) return;
    setSelectedOption(option);
    localStorage.setItem(`announcement_voted_${announcement.id}`, option);

    try {
      await fetch("/api/portal/announcements/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcementId: announcement.id,
          customerId,
          selectedOption: option,
          platform: "web",
        }),
      });
      toast.success(t("voteSuccess"));
    } catch (err) {
      console.error("Failed to submit vote", err);
    }
  }

  async function handleSendFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOption || !feedbackText.trim() || submitting) return;

    setSubmitting(true);
    try {
      await fetch("/api/portal/announcements/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcementId: announcement.id,
          customerId,
          selectedOption,
          feedbackText,
          platform: "web",
        }),
      });
      setFeedbackSent(true);
      toast.success(t("feedbackSent"));
    } catch (err) {
      console.error("Failed to send feedback", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-mv-green/20 bg-gradient-to-br from-mv-surface via-mv-cream-soft to-mv-green-tint/30 p-5 shadow-mv-sm">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t("dismissAria")}
        className="absolute right-3.5 top-3.5 rounded-full p-1 text-mv-ink-faint transition-colors hover:bg-mv-cream hover:text-mv-ink"
      >
        <X size={15} />
      </button>

      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-mv-green-dark">
        <Sparkles size={12} />
        <span>{announcement.badgeLabel || t("badgeDefault")}</span>
      </div>

      <h3 className="mt-2 font-display text-[17px] font-medium leading-snug text-mv-ink">
        {announcement.title}
      </h3>

      <p className="mt-1 text-[13px] leading-relaxed text-mv-ink-soft">
        {announcement.body}
      </p>

      {/* Micro-sondage interactif */}
      {announcement.pollQuestion && (
        <div className="mt-4 rounded-xl border border-mv-border/80 bg-mv-surface/90 p-3.5 backdrop-blur-xs">
          <p className="text-[13px] font-medium text-mv-ink">
            {announcement.pollQuestion}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-2">
            {announcement.pollOptions.map((opt) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => void handleVote(opt)}
                  disabled={Boolean(selectedOption)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                    isSelected
                      ? "border-mv-green bg-mv-green text-mv-cream shadow-xs"
                      : selectedOption
                        ? "border-mv-border bg-mv-cream/40 text-mv-ink-faint opacity-60"
                        : "border-mv-border bg-mv-surface text-mv-ink hover:border-mv-green/50 hover:bg-mv-cream/50 active:scale-97"
                  }`}
                >
                  {isSelected && <Check size={13} className="stroke-[2.5]" />}
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {selectedOption && !feedbackSent && (
            <form onSubmit={handleSendFeedback} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={t("feedbackOptionalPlaceholder")}
                className="h-8 flex-1 rounded-lg border border-mv-border bg-mv-surface px-2.5 text-[12px] text-mv-ink placeholder:text-mv-ink-faint outline-none focus:border-mv-green"
              />
              <button
                type="submit"
                disabled={submitting || !feedbackText.trim()}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-mv-green px-3 text-[12px] font-medium text-mv-cream transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send size={12} />
                <span>{t("sendFeedback")}</span>
              </button>
            </form>
          )}

          {feedbackSent && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-mv-green-dark">
              <MessageSquareHeart size={14} />
              <span>{t("voteSuccess")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
