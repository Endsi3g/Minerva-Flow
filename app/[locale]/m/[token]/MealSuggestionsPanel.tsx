"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import {
  getPublicMealSuggestionsAction,
  submitPublicMealSuggestionAction,
  votePublicMealSuggestionAction,
  type PublicMealSuggestion,
} from "./actions";

export function MealSuggestionsPanel({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations("menu.customerSuggestions");
  const [suggestions, setSuggestions] = useState<PublicMealSuggestion[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function refresh() {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await getPublicMealSuggestionsAction(restaurantId);
      if (result.ok) setSuggestions(result.suggestions);
      else setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getPublicMealSuggestionsAction(restaurantId).then((result) => {
      if (!active) return;
      if (result.ok) setSuggestions(result.suggestions);
      else setLoadError(true);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setLoadError(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, [restaurantId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(false);
    let ok = false;
    try {
      ok = await submitPublicMealSuggestionAction(restaurantId, title, description);
    } catch {
      ok = false;
    } finally {
      setSubmitting(false);
    }
    if (!ok) {
      setError(true);
      return;
    }
    setTitle("");
    setDescription("");
    toast.success(t("submitted"));
    await refresh();
  }

  async function vote(id: string) {
    try {
      const result = await votePublicMealSuggestionAction(id);
      if (!result) {
        toast.error(t("voteFailed"));
        return;
      }
      setSuggestions((current) => current.map((item) => item.id === id
        ? { ...item, vote_count: result.voteCount, has_voted: result.hasVoted }
        : item).sort((a, b) => b.vote_count - a.vote_count));
    } catch {
      toast.error(t("voteFailed"));
    }
  }

  return (
    <Card className="mb-8 border-mv-green/20 bg-mv-surface p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-xl bg-mv-green/10 p-2 text-mv-green-dark"><Lightbulb size={18} /></span>
        <div>
          <h2 className="font-serif text-lg text-mv-ink">{t("title")}</h2>
          <p className="mt-0.5 text-[12px] text-mv-ink-soft">{t("description")}</p>
        </div>
      </div>
      <form onSubmit={submit} className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={120} required
          placeholder={t("namePlaceholder")} aria-label={t("namePlaceholder")}
          className="h-10 min-w-0 rounded-lg border border-mv-border bg-white px-3 text-[13px] text-mv-ink outline-none focus:border-mv-green" />
        <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000}
          placeholder={t("detailPlaceholder")} aria-label={t("detailPlaceholder")}
          className="h-10 min-w-0 rounded-lg border border-mv-border bg-white px-3 text-[13px] text-mv-ink outline-none focus:border-mv-green" />
        <Button type="submit" disabled={submitting || title.trim().length < 3} size="sm">
          {submitting ? t("sending") : t("suggest")}
        </Button>
      </form>
      {error && <p role="alert" className="mb-3 text-[12px] text-mv-red">{t("submitFailed")}</p>}
      {loading ? (
        <div className="h-14 animate-pulse rounded-lg bg-mv-cream-soft" aria-label={t("loading")} />
      ) : loadError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-mv-cream-soft px-3 py-2.5 text-[12px] text-mv-ink-soft">
          <span>{t("loadFailed")}</span>
          <button type="button" disabled={loading} onClick={() => void refresh()} className="font-semibold text-mv-green-dark underline-offset-2 hover:underline disabled:opacity-50">{loading ? t("loading") : t("retry")}</button>
        </div>
      ) : suggestions.length === 0 ? (
        <p className="rounded-lg bg-mv-cream-soft px-3 py-2.5 text-[12px] text-mv-ink-faint">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg border border-mv-border-soft px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-mv-ink">{item.title}</p>
                {item.description && <p className="line-clamp-1 text-[11.5px] text-mv-ink-soft">{item.description}</p>}
              </div>
              {item.status === "open" ? (
                <button type="button" onClick={() => void vote(item.id)} aria-pressed={item.has_voted}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-mv-border px-2.5 py-1.5 text-[11px] font-semibold text-mv-ink-soft hover:border-mv-green hover:text-mv-green-dark aria-pressed:border-mv-green aria-pressed:bg-mv-green/10 aria-pressed:text-mv-green-dark">
                  <ThumbsUp size={13} /> {item.vote_count}
                </button>
              ) : <span className="shrink-0 rounded-full bg-mv-cream-soft px-2.5 py-1.5 text-[10px] font-medium text-mv-ink-soft">{t("inReview")}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
