"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import type { Customer, LoyaltyReward, LoyaltyTransactionType, ReferralProgram } from "@/lib/types";
import type { ReferralLinkTracking } from "@/lib/data/customer-referrals";
import { Heart, Plus, Trash2, Gift, Search, Link2, MousePointerClick } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  createCustomerAction,
  deleteCustomerAction,
  logVisitAction,
  redeemRewardAction,
  createLoyaltyRewardAction,
  deleteLoyaltyRewardAction,
  updateLoyaltyRateAction,
  createReferralProgramAction,
  updateReferralProgramActiveAction,
  deleteReferralProgramAction,
} from "./actions";
import { toast } from "sonner";

const txLabel: Record<LoyaltyTransactionType, string> = {
  visite: "Visite",
  ajustement: "Ajustement",
  echange: "Échange",
};

function NewCustomerModal({
  restaurantId,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (c: Customer) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const customer = await createCustomerAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? "") || null,
        phone: String(form.get("phone") ?? "") || null,
        notes: String(form.get("notes") ?? "") || null,
      });
      if (customer) {
        onCreated(customer);
        onClose();
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error("L'ajout du client a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau client" description="Créez une fiche pour commencer à suivre ses visites.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom">
          <Input name="name" placeholder="Ex : Jeanne Tremblay" required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Courriel" hint="Optionnel">
            <Input name="email" type="email" />
          </Field>
          <Field label="Téléphone" hint="Optionnel">
            <Input name="phone" type="tel" />
          </Field>
        </div>
        <Field label="Notes" hint="Optionnel — allergies, préférences…">
          <Input name="notes" />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RewardsCard({
  restaurantId,
  rewards,
  onChange,
}: {
  restaurantId: string;
  rewards: LoyaltyReward[];
  onChange: (rewards: LoyaltyReward[]) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const reward = await createLoyaltyRewardAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        pointsCost: Number(form.get("pointsCost") ?? 0),
      });
      if (reward) {
        onChange([...rewards, reward].sort((a, b) => a.pointsCost - b.pointsCost));
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error("L'ajout de la récompense a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteLoyaltyRewardAction(restaurantId, id);
    if (ok) onChange(rewards.filter((r) => r.id !== id));
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Catalogue"
        title="Récompenses"
        description="Ce que les clients peuvent échanger contre leurs points."
      />
      <div className="mb-3 space-y-1.5">
        {rewards.length === 0 && <p className="text-[12.5px] text-mv-ink-faint">Aucune récompense configurée.</p>}
        {rewards.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2">
            <span className="text-[13px] font-medium text-mv-ink">{r.name}</span>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{r.pointsCost} pts</Badge>
              <button
                onClick={() => handleDelete(r.id)}
                aria-label="Retirer la récompense"
                className="text-mv-ink-faint transition-colors hover:text-mv-red"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 border-t border-mv-border-soft pt-3">
        <Field label="Nom">
          <Input name="name" placeholder="Ex : Café gratuit" required className="w-56" />
        </Field>
        <Field label="Coût en points">
          <Input name="pointsCost" type="number" min="1" step="1" required className="w-28" />
        </Field>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          <Plus size={14} /> Ajouter
        </Button>
      </form>
    </Card>
  );
}

function NewReferralProgramModal({
  restaurantId,
  rewards,
  open,
  onClose,
  onCreated,
}: {
  restaurantId: string;
  rewards: LoyaltyReward[];
  open: boolean;
  onClose: () => void;
  onCreated: (program: ReferralProgram) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const program = await createReferralProgramAction(restaurantId, {
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? "") || null,
        goalCount: Number(form.get("goalCount") ?? 1),
        rewardId: String(form.get("rewardId") ?? "") || null,
        rewardDescription: String(form.get("rewardDescription") ?? "") || null,
      });
      if (program) {
        onCreated(program);
        onClose();
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error("La création du programme a échoué.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau programme de parrainage"
      description="Vos clients partagent un lien ; une fois l'objectif atteint, ils débloquent la récompense."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nom">
          <Input name="name" placeholder="Ex : Amenez un ami" required autoFocus />
        </Field>
        <Field label="Description" hint="Optionnel">
          <Input name="description" placeholder="Ex : valable jusqu'à la fin de l'été" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Objectif" hint="Nombre de parrainages réussis requis">
            <Input name="goalCount" type="number" min="1" step="1" defaultValue="1" required />
          </Field>
          <Field label="Récompense du catalogue" hint="Optionnel">
            <Select name="rewardId" defaultValue="">
              <option value="">—</option>
              {rewards.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Ou décrivez la récompense librement" hint="Optionnel — affiché au client">
          <Input name="rewardDescription" placeholder="Ex : dessert offert" />
        </Field>
        <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Création…" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReferralProgramsCard({
  restaurantId,
  programs,
  rewards,
  links,
  onChange,
}: {
  restaurantId: string;
  programs: ReferralProgram[];
  rewards: LoyaltyReward[];
  links: ReferralLinkTracking[];
  onChange: (programs: ReferralProgram[]) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  async function handleToggleActive(program: ReferralProgram) {
    const ok = await updateReferralProgramActiveAction(restaurantId, program.id, !program.active);
    if (ok) {
      onChange(programs.map((p) => (p.id === program.id ? { ...p, active: !p.active } : p)));
    } else {
      toast.error("La mise à jour a échoué.");
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteReferralProgramAction(restaurantId, id);
    if (ok) onChange(programs.filter((p) => p.id !== id));
  }

  return (
    <>
      <Card>
        <CardHeader
          eyebrow="Parrainage"
          title="Programmes de parrainage"
          description="Vos clients partagent un lien depuis leur espace client — suivez qui génère quoi."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Nouveau programme
            </Button>
          }
        />

        {programs.length === 0 ? (
          <p className="text-[12.5px] text-mv-ink-faint">Aucun programme de parrainage pour l&apos;instant.</p>
        ) : (
          <div className="mb-4 space-y-1.5">
            {programs.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-mv-ink">{p.name}</p>
                  <p className="text-[11.5px] text-mv-ink-faint">
                    Objectif : {p.goalCount} parrainage{p.goalCount > 1 ? "s" : ""}
                    {p.rewardDescription ? ` — ${p.rewardDescription}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={p.active ? "green" : "neutral"}>{p.active ? "Actif" : "Inactif"}</Badge>
                  <button
                    onClick={() => handleToggleActive(p)}
                    className="rounded-md px-2 py-1 text-[11.5px] font-medium text-mv-ink-soft hover:bg-mv-ink/5"
                  >
                    {p.active ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    aria-label="Supprimer le programme"
                    className="text-mv-ink-faint transition-colors hover:text-mv-red"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {links.length > 0 && (
          <div className="border-t border-mv-border-soft pt-3">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mv-ink-faint">
              Suivi des liens
            </p>
            <div className="space-y-1.5">
              {links.map((t) => (
                <div
                  key={t.link.id}
                  className="flex items-center justify-between rounded-lg bg-mv-cream-soft px-3 py-2 text-[12.5px]"
                >
                  <div>
                    <span className="font-medium text-mv-ink">{t.customerName}</span>
                    <span className="text-mv-ink-faint"> — {t.programName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-mv-ink-soft">
                    <span className="flex items-center gap-1">
                      <MousePointerClick size={12} /> {t.link.clicks}
                    </span>
                    <span className="flex items-center gap-1">
                      <Link2 size={12} /> {t.link.convertedCount}
                    </span>
                    {t.link.rewardClaimedAt && <Badge tone="green">Débloquée</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <NewReferralProgramModal
        restaurantId={restaurantId}
        rewards={rewards}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(program) => onChange([program, ...programs])}
      />
    </>
  );
}

export function FidelisationView({
  restaurantId,
  initialCustomers,
  initialRewards,
  loyaltyPointsPerDollar,
  initialReferralPrograms,
  referralLinks,
}: {
  restaurantId: string | null;
  initialCustomers: Customer[];
  initialRewards: LoyaltyReward[];
  loyaltyPointsPerDollar: number;
  initialReferralPrograms: ReferralProgram[];
  referralLinks: ReferralLinkTracking[];
}) {
  const { role } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [customers, setCustomers] = useState(initialCustomers);
  const [rewards, setRewards] = useState(initialRewards);
  const [referralPrograms, setReferralPrograms] = useState(initialReferralPrograms);
  const [rate, setRate] = useState(loyaltyPointsPerDollar);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [createOpen, setCreateOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canCreate = Boolean(restaurantId) && (role === "owner" || role === "manager" || role === "staff");
  const canManage = role === "owner" || role === "manager";

  function handleSelect(id: string) {
    setSelectedId(id);
    router.push(`/fidelisation?id=${id}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const selected = customers.find((c) => c.id === selectedId);

  async function handleVisitSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!restaurantId || !selected) return;
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get("amount") ?? 0);
    const note = String(form.get("note") ?? "") || null;
    if (!Number.isFinite(amount) || amount <= 0) return;

    const updated = await logVisitAction(restaurantId, selected.id, amount, note);
    if (updated) {
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setVisitOpen(false);
      (e.target as HTMLFormElement).reset();
    } else {
      toast.error("L'enregistrement de la visite a échoué.");
    }
  }

  async function handleRedeem(rewardId: string) {
    if (!restaurantId || !selected) return;
    const updated = await redeemRewardAction(restaurantId, selected.id, rewardId);
    if (updated) {
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      toast.error("L'échange a échoué — solde de points insuffisant ?");
    }
  }

  function handleDelete(id: string) {
    if (!restaurantId) return;
    startTransition(async () => {
      const ok = await deleteCustomerAction(restaurantId, id);
      if (ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        if (selectedId === id) setSelectedId(null);
      } else {
        toast.error("La suppression a échoué.");
      }
    });
  }

  async function handleRateBlur() {
    if (!restaurantId || !canManage) return;
    await updateLoyaltyRateAction(restaurantId, rate);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Clients"
        title="Fidélisation"
        description="Fiches clients, visites et points de fidélité."
        action={
          canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Nouveau client
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative w-64">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mv-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="pl-8"
          />
        </div>
        {canManage && (
          <label
            className="flex items-center gap-1.5 text-[12.5px] text-mv-ink-soft"
            title="Points attribués par dollar dépensé — s'applique aux prochaines visites"
          >
            Taux :
            <input
              type="number"
              min="0"
              step="0.5"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              onBlur={handleRateBlur}
              className="h-8 w-16 rounded-md border border-mv-border bg-mv-surface px-2 text-[12.5px]"
            />
            pts/$
          </label>
        )}
        <span className="text-[12.5px] text-mv-ink-faint">
          {filtered.length} client{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={selected ? "xl:col-span-7" : "xl:col-span-12"}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="Aucun client"
              description="Ajoutez votre première fiche client pour commencer à suivre les visites et les points."
              action={
                canCreate && (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus size={15} /> Nouveau client
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>Client</Th>
                <Th>Dernière visite</Th>
                <Th className="text-right">Visites</Th>
                <Th className="text-right">Total dépensé</Th>
                <Th className="text-right">Points</Th>
              </THead>
              <tbody>
                {filtered.map((c) => (
                  <Tr key={c.id} onClick={() => handleSelect(c.id)} active={c.id === selectedId}>
                    <Td className="font-semibold">{c.name}</Td>
                    <Td className="text-mv-ink-soft">{c.lastVisitAt ? formatDate(c.lastVisitAt) : "—"}</Td>
                    <Td className="text-right">{c.visitCount}</Td>
                    <Td className="text-right font-medium">{formatCurrency(c.totalSpent)}</Td>
                    <Td className="text-right">
                      <Badge tone="green">{c.loyaltyPoints} pts</Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>

        {selected && (
          <div className="xl:col-span-5">
            <div className="space-y-4 xl:sticky xl:top-6">
              <Card>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Badge tone="green">{selected.loyaltyPoints} points</Badge>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(selected.id)}
                      disabled={isPending}
                      aria-label="Supprimer le client"
                      className="rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-red/10 hover:text-mv-red disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <h2 className="font-display text-[19px] font-medium text-mv-ink">{selected.name}</h2>
                <p className="text-[12.5px] text-mv-ink-faint">
                  {[selected.email, selected.phone].filter(Boolean).join(" — ") || "Aucune coordonnée"}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-mv-cream-soft p-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Visites</p>
                    <p className="font-display text-[16px] font-medium text-mv-ink">{selected.visitCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Total dépensé</p>
                    <p className="font-display text-[16px] font-medium text-mv-ink">
                      {formatCurrency(selected.totalSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Points</p>
                    <p className="font-display text-[16px] font-medium text-mv-green-dark">
                      {selected.loyaltyPoints}
                    </p>
                  </div>
                </div>

                {canCreate && (
                  <Button size="sm" onClick={() => setVisitOpen(true)} className="mt-4 w-full">
                    <Plus size={14} /> Enregistrer une visite
                  </Button>
                )}
              </Card>

              <Card>
                <CardHeader title="Récompenses" description={`${rewards.filter((r) => r.active).length} disponible(s)`} />
                {rewards.filter((r) => r.active).length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">Aucune récompense configurée.</p>
                ) : (
                  <div className="space-y-2">
                    {rewards
                      .filter((r) => r.active)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <Gift size={14} className="text-mv-ink-faint" />
                            <span className="text-[13px] font-medium text-mv-ink">{r.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone="neutral">{r.pointsCost} pts</Badge>
                            {canCreate && (
                              <Button
                                size="xs"
                                variant="secondary"
                                disabled={selected.loyaltyPoints < r.pointsCost}
                                onClick={() => handleRedeem(r.id)}
                              >
                                Échanger
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader title="Historique" description={`${selected.transactions.length} transaction(s)`} />
                {selected.transactions.length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">Aucune transaction pour ce client.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.transactions.map((t) => (
                      <div key={t.id} className="rounded-lg bg-mv-cream-soft p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-mv-ink">{txLabel[t.type]}</span>
                          <span className="text-[11px] text-mv-ink-faint">{formatDate(t.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[12.5px]">
                          <span className="text-mv-ink-soft">
                            {t.note ?? (t.amountSpent != null ? formatCurrency(t.amountSpent) : "—")}
                          </span>
                          <span className={t.pointsDelta >= 0 ? "font-semibold text-mv-green-dark" : "font-semibold text-mv-red"}>
                            {t.pointsDelta >= 0 ? "+" : ""}
                            {t.pointsDelta} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {canManage && (
        <div className="mt-6 space-y-6">
          <RewardsCard restaurantId={restaurantId!} rewards={rewards} onChange={setRewards} />
          <ReferralProgramsCard
            restaurantId={restaurantId!}
            programs={referralPrograms}
            rewards={rewards}
            links={referralLinks}
            onChange={setReferralPrograms}
          />
        </div>
      )}

      {restaurantId && (
        <NewCustomerModal
          restaurantId={restaurantId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
            handleSelect(c.id);
          }}
        />
      )}

      {selected && (
        <Modal open={visitOpen} onClose={() => setVisitOpen(false)} title="Enregistrer une visite" description={`Pour ${selected.name}`}>
          <form onSubmit={handleVisitSubmit} className="space-y-3">
            <Field label="Montant dépensé">
              <Input name="amount" type="number" min="0" step="0.01" required autoFocus />
            </Field>
            <Field label="Note" hint="Optionnel">
              <Input name="note" placeholder="Ex : anniversaire, groupe de 6" />
            </Field>
            <div className="flex items-center justify-end gap-2 border-t border-mv-border-soft pt-4">
              <Button type="button" variant="ghost" onClick={() => setVisitOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
