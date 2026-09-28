"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Lightbulb, Plus, RefreshCw, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/minerva/PageCard";
import { toast } from "sonner";
import type { MenuItem } from "@/lib/types";
import type { MealSuggestion } from "@/lib/data/meal-suggestions";
import { createMenuDraftFromSuggestionAction } from "./actions";

export function MealSuggestionsOwnerPanel({
  restaurantId,
  initialSuggestions,
  initialLoadFailed,
  onDraftCreated,
}: {
  restaurantId: string;
  initialSuggestions: MealSuggestion[];
  initialLoadFailed: boolean;
  onDraftCreated: (item: MenuItem) => void;
}) {
  const t = useTranslations("ownerMealSuggestions");
  const router = useRouter();
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function createDraft(suggestion: MealSuggestion) {
    setBusyId(suggestion.id);
    try {
      const result = await createMenuDraftFromSuggestionAction(restaurantId, suggestion.id);
      if (!result.ok) {
        toast.error(result.reason === "not_authorized" ? t("notAuthorized") : t("createFailed"));
        return;
      }
      onDraftCreated(result.item);
      setSuggestions((current) => current.map((item) => item.id === suggestion.id
        ? { ...item, status: "draft_added", menu_item_id: result.item.id }
        : item));
      toast.success(t("draftCreated"));
    } catch {
      toast.error(t("createFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="mb-6 overflow-hidden border-mv-green/20">
      <div className="flex items-start justify-between gap-3 border-b border-mv-border-soft bg-mv-cream-soft/60 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-mv-green/10 p-2 text-mv-green-dark"><Lightbulb size={17} /></span>
          <div>
            <h2 className="font-serif text-[17px] text-mv-ink">{t("title")}</h2>
            <p className="mt-0.5 text-[11.5px] text-mv-ink-soft">{t("description")}</p>
          </div>
        </div>
        <Badge tone={initialLoadFailed ? "red" : suggestions.some((item) => item.status !== "draft_added") ? "amber" : "neutral"}>
          {initialLoadFailed ? t("unavailable") : suggestions.length}
        </Badge>
      </div>
      <div className="divide-y divide-mv-border-soft px-4 sm:px-5">
        {initialLoadFailed ? (
          <div data-testid="meal-suggestions-load-error" role="alert" className="flex flex-wrap items-center justify-between gap-3 py-4 text-[12px] text-mv-ink-soft">
            <p>{t("loadFailed")}</p>
            <Button size="sm" variant="secondary" onClick={() => router.refresh()}><RefreshCw size={13} />{t("retry")}</Button>
          </div>
        ) : suggestions.length === 0 ? (
          <p className="py-5 text-center text-[12px] text-mv-ink-faint">{t("empty")}</p>
        ) : suggestions.map((suggestion) => (
          <article key={suggestion.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[13px] font-semibold text-mv-ink">{suggestion.title}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-mv-cream-soft px-2 py-0.5 text-[11px] font-medium text-mv-ink-soft">
                  <ThumbsUp size={12} /> {t("votes", { count: suggestion.vote_count })}
                </span>
                {suggestion.status === "draft_added" && <Badge tone="green">{t("draftStatus")}</Badge>}
              </div>
              {suggestion.description && <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-mv-ink-soft">{suggestion.description}</p>}
            </div>
            {suggestion.status === "draft_added" ? (
              <span className="text-[11.5px] text-mv-ink-faint">{t("draftStatus")}</span>
            ) : (
              <Button size="sm" variant="secondary" disabled={busyId !== null} onClick={() => void createDraft(suggestion)}>
                <Plus size={14} /> {busyId === suggestion.id ? t("creating") : t("createDraft")}
              </Button>
            )}
          </article>
        ))}
      </div>
    </Card>
  );
}
