"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { createIncidentAction } from "./actions";
import type { Incident } from "@/lib/data/incidents";
import { formatDate } from "@/lib/utils";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const severityTone: Record<Incident["severity"], "neutral" | "amber" | "red"> = {
  faible: "neutral",
  moyenne: "amber",
  critique: "red",
};

const severityTranslationKey: Record<Incident["severity"], "severityLow" | "severityMedium" | "severityHigh"> = {
  faible: "severityLow",
  moyenne: "severityMedium",
  critique: "severityHigh",
};

export function IncidentsView({ initialIncidents }: { initialIncidents: Incident[] }) {
  const t = useTranslations("admin.incidents");
  const [incidents, setIncidents] = useState(initialIncidents);
  const [formOpen, setFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const ok = await createIncidentAction({
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        severity: form.get("severity") as Incident["severity"],
        affectedUserCount: Number(form.get("affectedUserCount") ?? 0),
      });
      if (ok) {
        toast.success(t("saveSuccess"));
        setFormOpen(false);
        (e.target as HTMLFormElement).reset();
        window.location.reload();
      } else {
        toast.error(t("saveFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button size="sm" variant="secondary" onClick={() => setFormOpen((v) => !v)}>
        {formOpen ? t("cancel") : t("logIncident")}
      </Button>

      {formOpen && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t("titleLabel")}>
              <Input name="title" placeholder={t("titlePlaceholder")} required />
            </Field>
            <Field label={t("descriptionLabel")}>
              <Textarea name="description" rows={4} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("severityLabel")}>
                <Select name="severity" defaultValue="faible">
                  <option value="faible">{t("severityLow")}</option>
                  <option value="moyenne">{t("severityMedium")}</option>
                  <option value="critique">{t("severityHigh")}</option>
                </Select>
              </Field>
              <Field label={t("affectedUsersLabel")}>
                <Input name="affectedUserCount" type="number" min="0" defaultValue="0" />
              </Field>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("saving") : t("save")}
            </Button>
          </form>
        </Card>
      )}

      {incidents.length === 0 ? (
        <p className="text-[13px] text-mv-ink-faint">{t("emptyState")}</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((i) => (
            <Card key={i.id}>
              <CardHeader
                eyebrow={formatDate(i.occurredAt.slice(0, 10))}
                title={i.title}
                action={<Badge tone={severityTone[i.severity]}>{t(severityTranslationKey[i.severity])}</Badge>}
              />
              <p className="text-[13px] text-mv-ink-soft">{i.description}</p>
              <p className="mt-2 text-[11.5px] text-mv-ink-faint">
                {t("affectedUsersCount", { count: i.affectedUserCount })}
                {i.resolution ? t("resolvedSuffix", { resolution: i.resolution }) : t("unresolvedSuffix")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
