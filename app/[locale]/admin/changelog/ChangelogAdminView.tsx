"use client";

import { Card } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { MenuImageUpload } from "@/components/menu/MenuImageUpload";
import { publishChangelogEntryAction } from "./actions";
import type { ChangelogCategory, ChangelogEntry } from "@/lib/data/changelog";
import { formatDateFull, formatTime } from "@/lib/utils";
import { Bell } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const categoryTone: Record<ChangelogCategory, "green" | "amber" | "neutral"> = {
  fonctionnalite: "green",
  amelioration: "amber",
  correctif: "neutral",
};

export function ChangelogAdminView({ initialEntries }: { initialEntries: ChangelogEntry[] }) {
  const t = useTranslations("admin.changelog");
  const [entries, setEntries] = useState(initialEntries);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadScopeId, setUploadScopeId] = useState(() => crypto.randomUUID());

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const ok = await publishChangelogEntryAction({
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        category: form.get("category") as ChangelogCategory,
        imageUrl,
      });
      if (ok) {
        toast.success(t("publishSuccess"));
        (e.target as HTMLFormElement).reset();
        setImageUrl(null);
        setUploadScopeId(crypto.randomUUID());
        window.location.reload();
      } else {
        toast.error(t("publishFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-3 flex items-center gap-2 text-[12.5px] text-mv-ink-faint">
          <Bell size={13} /> {t("notifyHint")}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t("titleLabel")}>
            <Input name="title" placeholder={t("titlePlaceholder")} required />
          </Field>
          <Field label={t("descriptionLabel")}>
            <Textarea name="description" rows={3} required />
          </Field>
          <Field label={t("categoryLabel")}>
            <Select name="category" defaultValue="fonctionnalite">
              <option value="fonctionnalite">{t("category.fonctionnalite")}</option>
              <option value="amelioration">{t("category.amelioration")}</option>
              <option value="correctif">{t("category.correctif")}</option>
            </Select>
          </Field>
          <Field label={t("screenshotLabel")} hint={t("screenshotHint")}>
            <MenuImageUpload
              restaurantId="changelog"
              scopeId={uploadScopeId}
              bucket="changelog-images"
              currentUrl={imageUrl}
              onUploaded={setImageUrl}
            />
          </Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("publishing") : t("publishAndNotify")}
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-mv-border bg-mv-surface p-3.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <Badge tone={categoryTone[entry.category]}>{t(`category.${entry.category}`)}</Badge>
              <span className="text-[11px] text-mv-ink-faint">
                {formatDateFull(entry.publishedAt.slice(0, 10))} · {formatTime(entry.publishedAt)}
              </span>
            </div>
            <p className="text-[13.5px] font-semibold text-mv-ink">{entry.title}</p>
            <p className="mt-1 text-[12.5px] text-mv-ink-soft">{entry.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
