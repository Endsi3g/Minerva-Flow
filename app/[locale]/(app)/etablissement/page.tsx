"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/minerva/FormField";
import { GooglePlacesSearch } from "@/components/places/GooglePlacesSearch";
import { useApp, useCurrentRestaurant } from "@/lib/app-context";
import {
  createRestaurantAction,
  updateRestaurantAction,
} from "@/app/[locale]/(app)/settings/actions";
import type { RestaurantInput } from "@/lib/data/restaurants";
import type { Restaurant, OpeningHours, DayHours } from "@/lib/types";
import { Plus, MapPin, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type RestaurantFormValues = {
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  timezone: string;
  color: string;
  website: string;
  description: string;
  phone: string;
  openingHours: OpeningHours;
  lat?: number;
  lng?: number;
  googlePlaceId?: string;
};

const emptyForm: RestaurantFormValues = {
  name: "",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  timezone: "America/Montreal",
  color: "#167f5b",
  website: "",
  description: "",
  phone: "",
  openingHours: {},
};

function restaurantToForm(r: Restaurant): RestaurantFormValues {
  return {
    name: r.name,
    address: r.address ?? "",
    city: r.city ?? "",
    province: r.province ?? "",
    postalCode: r.postalCode ?? "",
    timezone: r.timezone,
    color: r.color,
    website: r.website ?? "",
    description: r.description ?? "",
    phone: r.phone ?? "",
    openingHours: r.openingHours ?? {},
  };
}

const DAY_LABELS: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  0: "Dimanche",
};
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function OpeningHoursFields({ value, onChange }: { value: OpeningHours; onChange: (hours: OpeningHours) => void }) {
  function setDay(day: number, hours: DayHours | null) {
    const next = { ...value };
    if (hours) {
      next[day as keyof OpeningHours] = hours;
    } else {
      delete next[day as keyof OpeningHours];
    }
    onChange(next);
  }

  return (
    <Field label="Horaires d'ouverture" hint="Se pré-remplissent automatiquement via la recherche Google ou le site web">
      <div className="space-y-1.5 rounded-lg border border-mv-border p-3">
        {DAY_ORDER.map((day) => {
          const hours = value[day as keyof OpeningHours];
          const closed = !hours;
          return (
            <div key={day} className="flex items-center gap-2">
              <label className="flex w-[92px] shrink-0 items-center gap-1.5 text-[12.5px] text-mv-ink-soft">
                <input
                  type="checkbox"
                  checked={!closed}
                  onChange={(e) => setDay(day, e.target.checked ? { open: "11:00", close: "22:00" } : null)}
                  className="h-3.5 w-3.5 rounded border-mv-border"
                />
                {DAY_LABELS[day]}
              </label>
              {hours ? (
                <>
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(e) => setDay(day, { ...hours, open: e.target.value })}
                    className="h-8 rounded-md border border-mv-border bg-mv-surface px-2 text-[12px] text-mv-ink"
                  />
                  <span className="text-mv-ink-faint">–</span>
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(e) => setDay(day, { ...hours, close: e.target.value })}
                    className="h-8 rounded-md border border-mv-border bg-mv-surface px-2 text-[12px] text-mv-ink"
                  />
                </>
              ) : (
                <span className="text-[12px] text-mv-ink-faint">Fermé</span>
              )}
            </div>
          );
        })}
      </div>
    </Field>
  );
}

function RestaurantFormFields({
  values,
  onChange,
}: {
  values: RestaurantFormValues;
  onChange: (patch: Partial<RestaurantFormValues>) => void;
}) {
  function handlePlacesSelect(patch: Partial<RestaurantInput>) {
    onChange({
      address: patch.address ?? values.address,
      city: patch.city ?? values.city,
      province: patch.province ?? values.province,
      postalCode: patch.postalCode ?? values.postalCode,
      phone: patch.phone ?? values.phone,
      openingHours: patch.openingHours ?? values.openingHours,
      lat: patch.lat,
      lng: patch.lng,
      googlePlaceId: patch.googlePlaceId,
    });
  }

  return (
    <div className="space-y-4">
      <GooglePlacesSearch onSelect={handlePlacesSelect} />

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
          <Input name="address" value={values.address} onChange={(e) => onChange({ address: e.target.value })} />
        </Field>
        <Field label="Ville">
          <Input name="city" value={values.city} onChange={(e) => onChange({ city: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Province">
          <Input name="province" value={values.province} onChange={(e) => onChange({ province: e.target.value })} placeholder="Ex : QC" />
        </Field>
        <Field label="Code postal">
          <Input name="postalCode" value={values.postalCode} onChange={(e) => onChange({ postalCode: e.target.value })} placeholder="Ex : H2X 1Y5" />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Téléphone">
          <Input name="phone" value={values.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="Ex : 514-555-1234" />
        </Field>
        <Field label="Fuseau horaire">
          <Input
            value={values.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
            placeholder="Ex : America/Montreal"
          />
        </Field>
      </div>
      <Field label="Site web" hint="La description et les coordonnées ci-dessous se pré-remplissent automatiquement depuis ce site quand vous enregistrez.">
        <Input
          value={values.website}
          onChange={(e) => onChange({ website: e.target.value })}
          placeholder="Ex : minerva-restaurant.com"
        />
      </Field>
      <Field label="Description" hint="Optionnel — modifiable même après la pré-remplissage automatique">
        <Textarea
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          placeholder="Ex : Cuisine bistro de quartier, produits locaux, terrasse l'été."
        />
      </Field>
      <OpeningHoursFields value={values.openingHours} onChange={(openingHours) => onChange({ openingHours })} />
    </div>
  );
}

function EstablishmentIdentityCard() {
  const restaurant = useCurrentRestaurant();
  const [form, setForm] = useState<RestaurantFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    setForm(restaurantToForm(restaurant));
  }, [restaurant?.id]);

  async function handleSave() {
    if (!restaurant || !form.name.trim()) return;
    setSaving(true);
    const updated = await updateRestaurantAction(restaurant.id, form);
    setSaving(false);
    if (updated) {
      // Reflects server-computed fields immediately — the description/
      // phone/address may have just been auto-filled from the website,
      // which the submitted form itself wouldn't know about.
      setForm(restaurantToForm(updated));
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
    setForm(restaurantToForm(r));
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
        description="Créez un nouveau restaurant à gérer dans Flow par Minerva."
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
