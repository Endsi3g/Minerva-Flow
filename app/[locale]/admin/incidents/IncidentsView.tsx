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

const severityTone: Record<Incident["severity"], "neutral" | "amber" | "red"> = {
  faible: "neutral",
  moyenne: "amber",
  critique: "red",
};

export function IncidentsView({ initialIncidents }: { initialIncidents: Incident[] }) {
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
        toast.success("Incident enregistré.");
        setFormOpen(false);
        (e.target as HTMLFormElement).reset();
        window.location.reload();
      } else {
        toast.error("Échec de l'enregistrement.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button size="sm" variant="secondary" onClick={() => setFormOpen((v) => !v)}>
        {formOpen ? "Annuler" : "Consigner un incident"}
      </Button>

      {formOpen && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Titre">
              <Input name="title" placeholder="Ex : Accès non autorisé à une table Supabase" required />
            </Field>
            <Field label="Description">
              <Textarea name="description" rows={4} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Gravité">
                <Select name="severity" defaultValue="faible">
                  <option value="faible">Faible</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="critique">Critique</option>
                </Select>
              </Field>
              <Field label="Utilisateurs affectés (estimation)">
                <Input name="affectedUserCount" type="number" min="0" defaultValue="0" />
              </Field>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : "Enregistrer l'incident"}
            </Button>
          </form>
        </Card>
      )}

      {incidents.length === 0 ? (
        <p className="text-[13px] text-mv-ink-faint">Aucun incident consigné — c'est le but.</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((i) => (
            <Card key={i.id}>
              <CardHeader
                eyebrow={formatDate(i.occurredAt.slice(0, 10))}
                title={i.title}
                action={<Badge tone={severityTone[i.severity]}>{i.severity}</Badge>}
              />
              <p className="text-[13px] text-mv-ink-soft">{i.description}</p>
              <p className="mt-2 text-[11.5px] text-mv-ink-faint">
                {i.affectedUserCount} utilisateur(s) affecté(s)
                {i.resolution ? ` · Résolu : ${i.resolution}` : " · Non résolu"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
