"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { Table, THead, Th, Tr, Td } from "@/components/ui/Table";
import { Field, Input, Select } from "@/components/ui/Input";
import { restaurants, connections, team } from "@/lib/mock-data";
import { roleLabels } from "@/lib/app-context";
import type { ConnectionStatus, ConnectionType, Role } from "@/lib/types";
import {
  Plus,
  MapPin,
  Clock,
  Landmark,
  CreditCard,
  Bike,
  Mail,
  RefreshCw,
  Eye,
  PenSquare,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const typeIcon: Record<ConnectionType, typeof Landmark> = {
  banque: Landmark,
  pos: CreditCard,
  livraison: Bike,
  email: Mail,
};

const typeLabel: Record<ConnectionType, string> = {
  banque: "Banque",
  pos: "Point de vente",
  livraison: "Livraison",
  email: "Email",
};

const statusTone: Record<ConnectionStatus, "green" | "red" | "amber"> = {
  connecte: "green",
  erreur: "red",
  attente: "amber",
};

const statusLabel: Record<ConnectionStatus, string> = {
  connecte: "Connecté",
  erreur: "Erreur",
  attente: "En attente",
};

const roleTone: Record<Role, "green" | "lime" | "amber"> = {
  owner: "green",
  staff: "lime",
  consultant: "amber",
};

const rolePermissions: Record<Role, { icon: typeof Eye; text: string }> = {
  owner: { icon: ShieldCheck, text: "Accès complet : configuration, finance, équipe, tous les modules." },
  staff: { icon: PenSquare, text: "Encode les journées de service : notes, événements, anomalies." },
  consultant: { icon: Eye, text: "Lecture des données et rédaction de notes / plans d'action." },
};

export default function SettingsPage() {
  const [tab, setTab] = useState("restaurants");

  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Settings" />

      <div className="mb-6">
        <Tabs
          tabs={[
            { id: "restaurants", label: "Restaurants" },
            { id: "roles", label: "Rôles & équipe" },
            { id: "integrations", label: "Intégrations" },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "restaurants" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm">
              <Plus size={15} /> Ajouter un établissement
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {restaurants.map((r) => (
              <Card key={r.id}>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  <h3 className="font-display text-[16px] font-medium text-mv-ink">{r.name}</h3>
                </div>
                <div className="space-y-1.5 text-[13px] text-mv-ink-soft">
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="text-mv-ink-faint" /> {r.address}, {r.city}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock size={14} className="text-mv-ink-faint" /> {r.timezone}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1">
                    Modifier
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <div className="mb-4 flex justify-end">
              <Button size="sm">
                <Plus size={15} /> Inviter un membre
              </Button>
            </div>
            <Table>
              <THead>
                <Th>Membre</Th>
                <Th>Rôle</Th>
                <Th>Établissements</Th>
                <Th>Statut</Th>
              </THead>
              <tbody>
                {team.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} size={30} />
                        <div>
                          <p className="font-semibold text-mv-ink">{m.name}</p>
                          <p className="text-[11.5px] text-mv-ink-faint">{m.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Select
                        defaultValue={m.role}
                        className="h-8 w-40 text-[12.5px]"
                      >
                        {(Object.keys(roleLabels) as Role[]).map((r) => (
                          <option key={r} value={r}>
                            {roleLabels[r]}
                          </option>
                        ))}
                      </Select>
                    </Td>
                    <Td className="text-mv-ink-soft">
                      {m.restaurantIds.length === restaurants.length
                        ? "Tous"
                        : restaurants
                            .filter((r) => m.restaurantIds.includes(r.id))
                            .map((r) => r.city)
                            .join(", ")}
                    </Td>
                    <Td>
                      <Badge tone={m.status === "actif" ? "green" : "amber"} dot>
                        {m.status === "actif" ? "Actif" : "Invitation envoyée"}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="xl:col-span-4">
            <Card>
              <CardHeader title="Permissions par rôle" />
              <div className="space-y-3">
                {(Object.keys(roleLabels) as Role[]).map((r) => {
                  const Icon = rolePermissions[r].icon;
                  return (
                    <div key={r} className="rounded-xl border border-mv-border-soft p-3.5">
                      <div className="mb-1.5 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mv-cream-soft text-mv-ink-soft">
                          <Icon size={14} />
                        </div>
                        <Badge tone={roleTone[r]}>{roleLabels[r]}</Badge>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">
                        {rolePermissions[r].text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm">
              <Plus size={15} /> Ajouter une intégration
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {connections.map((c) => {
              const Icon = typeIcon[c.type];
              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-mv-cream-soft text-mv-ink-soft">
                      <Icon size={17} />
                    </div>
                    <Badge tone={statusTone[c.status]} dot>
                      {statusLabel[c.status]}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-display text-[15px] font-medium text-mv-ink">{c.name}</h3>
                  <p className="text-[12px] text-mv-ink-faint">
                    {typeLabel[c.type]} · {c.lastSync}
                  </p>
                  {c.detail && <p className="mt-1.5 text-[12px] text-mv-red">{c.detail}</p>}
                  <div className="mt-4">
                    {c.status === "erreur" ? (
                      <Button size="sm" variant="secondary" className="w-full">
                        <RefreshCw size={13} /> Reconnecter
                      </Button>
                    ) : c.status === "attente" ? (
                      <Button size="sm" className="w-full">
                        Configurer
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="w-full">
                        Gérer
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader eyebrow="Nouvelle connexion" title="Connecter un service" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Type de service">
                <Select defaultValue="banque">
                  <option value="banque">Banque</option>
                  <option value="pos">Point de vente</option>
                  <option value="livraison">Livraison</option>
                  <option value="email">Email</option>
                </Select>
              </Field>
              <Field label="Nom du fournisseur">
                <Input placeholder="Ex : Stripe, Square…" />
              </Field>
              <div className="flex items-end">
                <Button className="w-full">Continuer</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
