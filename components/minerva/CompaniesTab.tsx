"use client";

import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Modal } from "@/components/ui/Modal";
import { useApp } from "@/lib/app-context";
import { Plus, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createCompanyAction,
  assignRestaurantToCompanyAction,
  getCompaniesWithRestaurantsAction,
} from "@/app/(app)/settings/actions";
import type { Company, Restaurant } from "@/lib/types";

type CompanyWithRestaurants = { company: Company; restaurants: Restaurant[] };

export function CompaniesTab() {
  const { restaurants } = useApp();
  const [groups, setGroups] = useState<CompanyWithRestaurants[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  async function refresh() {
    setLoading(true);
    const data = await getCompaniesWithRestaurantsAction();
    setGroups(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    await createCompanyAction(name);
    setName("");
    setCreateOpen(false);
    refresh();
  }

  async function handleAssign(restaurantId: string, companyId: string) {
    if (!companyId) return;
    await assignRestaurantToCompanyAction(restaurantId, companyId);
    refresh();
  }

  const assignedIds = new Set(groups.flatMap((g) => g.restaurants.map((r) => r.id)));
  const unassigned = restaurants.filter((r) => !assignedIds.has(r.id));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> Créer une entreprise
        </Button>
      </div>

      {loading ? (
        <p className="text-[13px] text-mv-ink-faint">Chargement…</p>
      ) : groups.length === 0 ? (
        <Card>
          <p className="text-[13px] text-mv-ink-soft">
            Regroupez plusieurs restaurants sous une entreprise pour les gérer ensemble.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {groups.map(({ company, restaurants: companyRestaurants }) => (
            <Card key={company.id}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <Building2 size={16} className="text-mv-ink-faint" /> {company.name}
                  </span>
                }
              />
              {companyRestaurants.length === 0 ? (
                <p className="text-[12.5px] text-mv-ink-faint">Aucun restaurant assigné.</p>
              ) : (
                <div className="space-y-1.5">
                  {companyRestaurants.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-[13px] text-mv-ink-soft">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {groups.length > 0 && unassigned.length > 0 && (
        <Card>
          <CardHeader eyebrow="Assigner" title="Restaurants sans entreprise" />
          <div className="space-y-2">
            {unassigned.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-mv-ink-soft">{r.name}</span>
                <Select
                  defaultValue=""
                  className="h-8 w-48 text-[12.5px]"
                  onChange={(e) => handleAssign(r.id, e.target.value)}
                >
                  <option value="" disabled>
                    Choisir une entreprise
                  </option>
                  {groups.map(({ company }) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Créer une entreprise"
        description="Regroupez plusieurs restaurants sous un même groupe."
      >
        <div className="space-y-4">
          <Field label="Nom de l'entreprise">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Groupe Vieux-Port" />
          </Field>
          <Button className="w-full" onClick={handleCreate} disabled={!name.trim()}>
            Créer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
