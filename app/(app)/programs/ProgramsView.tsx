"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { CreateProgramModal } from "@/components/forms/CreateProgramModal";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Campaign, Program, ProgramStatus, ProgramType } from "@/lib/types";
import { LineChart, Plus, MessageSquare, Trash2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { updateProgramStatusAction, deleteProgramAction } from "./actions";
import { toast } from "sonner";

const typeLabel: Record<ProgramType, string> = {
  brunch: "Brunch",
  soiree: "Soirée",
  saison: "Saison",
  evenement: "Événement",
};

const typeTone: Record<ProgramType, "green" | "lime" | "amber" | "neutral"> = {
  brunch: "amber",
  soiree: "neutral",
  saison: "green",
  evenement: "lime",
};

const statusTone: Record<ProgramStatus, "green" | "amber" | "neutral"> = {
  actif: "green",
  planifie: "amber",
  termine: "neutral",
};

const statusLabel: Record<ProgramStatus, string> = {
  actif: "Actif",
  planifie: "Planifié",
  termine: "Terminé",
};

export function ProgramsView({
  restaurantId,
  programs,
  campaigns,
}: {
  restaurantId: string | null;
  programs: Program[];
  campaigns: Campaign[];
}) {
  const { role } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [typeFilter, setTypeFilter] = useState<"all" | ProgramType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProgramStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [createOpen, setCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canCreate =
    Boolean(restaurantId) && (role === "owner" || role === "manager" || role === "staff");
  const canManage = role === "owner" || role === "manager";

  function handleStatusChange(status: ProgramStatus) {
    if (!restaurantId || !selectedId) return;
    startTransition(async () => {
      const updated = await updateProgramStatusAction(restaurantId, selectedId, status);
      if (!updated) toast.error("La mise à jour du statut a échoué.");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!restaurantId || !selectedId) return;
    startTransition(async () => {
      const ok = await deleteProgramAction(restaurantId, selectedId);
      if (!ok) {
        toast.error("La suppression a échoué.");
        return;
      }
      setSelectedId(null);
      router.refresh();
    });
  }

  const filtered = useMemo(
    () =>
      programs.filter(
        (p) =>
          (typeFilter === "all" || p.type === typeFilter) &&
          (statusFilter === "all" || p.status === statusFilter)
      ),
    [programs, typeFilter, statusFilter]
  );

  const selected: Program | undefined = programs.find((p) => p.id === selectedId);
  const selectedCampaigns = selected
    ? campaigns.filter((c) => selected.campaignIds.includes(c.id))
    : [];

  return (
    <div>
      <PageHeader
        eyebrow="Programmes"
        title="Programmes"
        description="Chaque source de revenu récurrente ou saisonnière — brunchs, soirées, périodes spéciales — avec sa performance."
        action={
          canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Nouveau programme
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Select
          className="w-auto"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | ProgramType)}
        >
          <option value="all">Tous les types</option>
          {(Object.keys(typeLabel) as ProgramType[]).map((t) => (
            <option key={t} value={t}>
              {typeLabel[t]}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | ProgramStatus)}
        >
          <option value="all">Tous les statuts</option>
          {(Object.keys(statusLabel) as ProgramStatus[]).map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </Select>
        <span className="text-[12.5px] text-mv-ink-faint">
          {filtered.length} programme{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={selected ? "xl:col-span-7" : "xl:col-span-12"}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={LineChart}
              title="Aucun programme ne correspond"
              description="Essayez d'élargir les filtres de type ou de statut."
            />
          ) : (
            <Table>
              <THead>
                <Th>Programme</Th>
                <Th>Type</Th>
                <Th>Dates</Th>
                <Th className="text-right">Revenu</Th>
                <Th className="text-right">Coût</Th>
                <Th className="text-right">Marge</Th>
                <Th>Statut</Th>
              </THead>
              <tbody>
                {filtered.map((p) => {
                  const margin =
                    p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : null;
                  return (
                    <Tr key={p.id} onClick={() => setSelectedId(p.id)} active={p.id === selectedId}>
                      <Td className="font-semibold">{p.name}</Td>
                      <Td>
                        <Badge tone={typeTone[p.type]}>{typeLabel[p.type]}</Badge>
                      </Td>
                      <Td className="text-mv-ink-soft">
                        {formatDate(p.startDate)} — {formatDate(p.endDate)}
                      </Td>
                      <Td className="text-right font-semibold">{formatCurrency(p.revenue)}</Td>
                      <Td className="text-right text-mv-ink-soft">{formatCurrency(p.cost)}</Td>
                      <Td className="text-right">
                        {margin !== null ? (
                          <span
                            className={margin >= 40 ? "text-mv-green-dark font-semibold" : "text-mv-ink-soft"}
                          >
                            {margin}%
                          </span>
                        ) : (
                          <span className="text-mv-ink-faint">—</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>

        {selected && (
          <div className="xl:col-span-5">
            <div className="space-y-4 xl:sticky xl:top-6">
              <Card>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Badge tone={typeTone[selected.type]}>{typeLabel[selected.type]}</Badge>
                  {canManage ? (
                    <div className="flex items-center gap-1.5">
                      <Select
                        className="h-8 w-auto text-[12px]"
                        value={selected.status}
                        disabled={isPending}
                        onChange={(e) => handleStatusChange(e.target.value as ProgramStatus)}
                      >
                        {(Object.keys(statusLabel) as ProgramStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {statusLabel[s]}
                          </option>
                        ))}
                      </Select>
                      <button
                        onClick={handleDelete}
                        disabled={isPending}
                        aria-label="Supprimer le programme"
                        className="rounded-md p-1.5 text-mv-ink-faint transition-colors hover:bg-mv-red/10 hover:text-mv-red disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <Badge tone={statusTone[selected.status]}>{statusLabel[selected.status]}</Badge>
                  )}
                </div>
                <h2 className="font-display text-[19px] font-medium text-mv-ink">
                  {selected.name}
                </h2>
                <p className="text-[12.5px] text-mv-ink-faint">
                  {formatDate(selected.startDate)} — {formatDate(selected.endDate)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-mv-cream-soft p-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Revenu</p>
                    <p className="font-display text-[16px] font-medium text-mv-ink">
                      {formatCurrency(selected.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Coût</p>
                    <p className="font-display text-[16px] font-medium text-mv-ink">
                      {formatCurrency(selected.cost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Marge</p>
                    <p className="font-display text-[16px] font-medium text-mv-green-dark">
                      {selected.revenue > 0
                        ? `${Math.round(((selected.revenue - selected.cost) / selected.revenue) * 100)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  {selected.dailyRevenue.length > 0 ? (
                    <RevenueChart data={selected.dailyRevenue} height={160} />
                  ) : (
                    <p className="rounded-lg bg-mv-cream-soft px-3 py-6 text-center text-[12.5px] text-mv-ink-faint">
                      Ce programme n&apos;a pas encore démarré.
                    </p>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="Campagnes associées" description={`${selectedCampaigns.length} campagne(s)`} />
                {selectedCampaigns.length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">Aucune campagne liée pour l&apos;instant.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCampaigns.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg border border-mv-border-soft px-3 py-2.5"
                      >
                        <div>
                          <p className="text-[13px] font-semibold text-mv-ink">{c.name}</p>
                          <p className="text-[11.5px] text-mv-ink-faint">{c.channel}</p>
                        </div>
                        <Badge tone="neutral">{formatCurrency(c.estimatedRevenue)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader
                  title="Notes du consultant"
                  description={`${selected.consultantNotes.length} note(s)`}
                  action={
                    role === "consultant" && (
                      <Button size="sm" variant="secondary">
                        <MessageSquare size={14} /> Ajouter
                      </Button>
                    )
                  }
                />
                {selected.consultantNotes.length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">
                    Aucune note pour ce programme pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selected.consultantNotes.map((n, i) => (
                      <div key={i} className="rounded-lg bg-mv-cream-soft p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-mv-ink">{n.author}</span>
                          <span className="text-[11px] text-mv-ink-faint">{formatDate(n.date)}</span>
                        </div>
                        <p className="text-[12.5px] leading-relaxed text-mv-ink-soft">{n.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {restaurantId && (
        <CreateProgramModal
          restaurantId={restaurantId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(program) => setSelectedId(program.id)}
        />
      )}
    </div>
  );
}
