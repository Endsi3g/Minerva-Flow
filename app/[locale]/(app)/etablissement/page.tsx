"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/minerva/FormField";
import { useApp, useCurrentRestaurant } from "@/lib/app-context";
import {
  createRestaurantAction,
  updateRestaurantAction,
} from "@/app/[locale]/(app)/settings/actions";
import type { Restaurant } from "@/lib/types";
import { Plus, MapPin, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type RestaurantFormValues = { name: string; address: string; city: string; timezone: string; color: string };

const emptyForm: RestaurantFormValues = {
  name: "",
  address: "",
  city: "",
  timezone: "America/Montreal",
  color: "#167f5b",
};

function RestaurantFormFields({
  values,
  onChange,
}: {
  values: RestaurantFormValues;
  onChange: (patch: Partial<RestaurantFormValues>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Nom de l'établissement">
            <Input
              value={values.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Ex : Minerva — Vieux-Port"
            />
          </Field>
        </div>
        <Field label="Couleur">
          <input
            type="color"
            value={values.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-9 w-11 cursor-pointer rounded-lg border border-mv-border bg-mv-surface p-1"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Adresse">
          <Input value={values.address} onChange={(e) => onChange({ address: e.target.value })} />
        </Field>
        <Field label="Ville">
          <Input value={values.city} onChange={(e) => onChange({ city: e.target.value })} />
        </Field>
      </div>
      <Field label="Fuseau horaire">
        <Input
          value={values.timezone}
          onChange={(e) => onChange({ timezone: e.target.value })}
          placeholder="Ex : America/Montreal"
        />
      </Field>
    </div>
  );
}

function EstablishmentIdentityCard() {
  const restaurant = useCurrentRestaurant();
  const [form, setForm] = useState<RestaurantFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    setForm({
      name: restaurant.name,
      address: restaurant.address ?? "",
      city: restaurant.city ?? "",
      timezone: restaurant.timezone,
      color: restaurant.color,
    });
  }, [restaurant?.id]);

  async function handleSave() {
    if (!restaurant || !form.name.trim()) return;
    setSaving(true);
    const updated = await updateRestaurantAction(restaurant.id, form);
    setSaving(false);
    if (updated) {
      toast.success("Établissement mis à jour.");
    } else {
      toast.error("La mise à jour a échoué.");
    }
  }

  if (!restaurant) return null;

  return (
    <Card>
      <CardHeader
        eyebrow="Identité"
        title="Votre établissement"
        description="Ces informations apparaissent dans le switcher, les rapports et la carte."
      />
      <div className="space-y-4">
        <RestaurantFormFields values={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
        <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </Card>
  );
}

function OtherEstablishments() {
  const { restaurants, restaurantId, setRestaurantId } = useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [form, setForm] = useState<RestaurantFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm(emptyForm);
    setCreateOpen(true);
  }

  function openEdit(r: Restaurant) {
    setEditing(r);
    setForm({ name: r.name, address: r.address ?? "", city: r.city ?? "", timezone: r.timezone, color: r.color });
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    const created = await createRestaurantAction(form);
    setSaving(false);
    if (created) {
      toast.success("Établissement ajouté.");
      setCreateOpen(false);
      setRestaurantId(created.id);
    } else {
      toast.error("L'ajout de l'établissement a échoué.");
    }
  }

  async function handleUpdate() {
    if (!editing || !form.name.trim()) return;
    setSaving(true);
    const updated = await updateRestaurantAction(editing.id, form);
    setSaving(false);
    if (updated) {
      toast.success("Établissement modifié.");
      setEditing(null);
    } else {
      toast.error("La modification a échoué.");
    }
  }

  const others = restaurants.filter((r) => r.id !== restaurantId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px] font-medium text-mv-ink">Autres établissements</h2>
        <Button size="sm" variant="secondary" onClick={openCreate}>
          <Plus size={15} /> Ajouter un établissement
        </Button>
      </div>

      {others.length === 0 ? (
        <p className="text-[13px] text-mv-ink-faint">
          Vous ne gérez qu&apos;un seul établissement pour l&apos;instant.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {others.map((r) => (
            <Card key={r.id}>
              <div className="mb-3 flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                <h3 className="font-display text-[16px] font-medium text-mv-ink">{r.name}</h3>
              </div>
              <div className="space-y-1.5 text-[13px] text-mv-ink-soft">
                <p className="flex items-center gap-2">
                  <MapPin size={14} className="text-mv-ink-faint" /> {r.address || "—"}
                  {r.city ? `, ${r.city}` : ""}
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={14} className="text-mv-ink-faint" /> {r.timezone}
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setRestaurantId(r.id)}>
                  Passer à celui-ci
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                  Modifier
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ajouter un établissement"
        description="Créez un nouveau restaurant à gérer dans Minerva Flow."
      >
        <div className="space-y-4">
          <RestaurantFormFields values={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
          <Button className="w-full" onClick={handleCreate} disabled={!form.name.trim() || saving}>
            {saving ? "Création…" : "Créer l'établissement"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Modifier l'établissement"
        description={editing?.name}
      >
        <div className="space-y-4">
          <RestaurantFormFields values={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
          <Button className="w-full" onClick={handleUpdate} disabled={!form.name.trim() || saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function EtablissementPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Établissements"
        title="Gérer mes établissements"
        description="Configurez l'identité de votre établissement et gérez vos autres emplacements."
      />
      <div className="space-y-8">
        <EstablishmentIdentityCard />
        <OtherEstablishments />
      </div>
    </div>
  );
}
