"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { updateCampaignStatusAction, getCampaignAssetsAction } from "@/app/(app)/campaigns/actions";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Campaign, CampaignAsset, CampaignChannel, CampaignStatus, CampaignType } from "@/lib/types";
import { Megaphone, Plus, Camera, Mail, Store, Users, FileText } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const typeLabel: Record<CampaignType, string> = {
  post: "Post",
  email: "Email",
  promo: "Promotion",
};

const channelIcon: Record<CampaignChannel, typeof Camera> = {
  Instagram: Camera,
  Facebook: Users,
  Email: Mail,
  "En salle": Store,
};

const statusTone: Record<CampaignStatus, "green" | "amber" | "neutral"> = {
  active: "green",
  planifiee: "amber",
  terminee: "neutral",
};

const statusLabel: Record<CampaignStatus, string> = {
  active: "Active",
  planifiee: "Planifiée",
  terminee: "Terminée",
};

const impactTone = { fort: "green", moyen: "amber", faible: "neutral" } as const;

export function CampaignsView({
  restaurantId,
  campaigns,
}: {
  restaurantId: string | null;
  campaigns: Campaign[];
}) {
  const { role } = useApp();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatus>("all");
  const [channelFilter, setChannelFilter] = useState<"all" | CampaignChannel>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canCreate =
    Boolean(restaurantId) && (role === "owner" || role === "manager" || role === "consultant");

  const [assets, setAssets] = useState<(CampaignAsset & { url: string | null })[]>([]);

  useEffect(() => {
    if (!selectedId) {
      setAssets([]);
      return;
    }
    getCampaignAssetsAction(selectedId).then(setAssets);
  }, [selectedId]);

  function handleStatusChange(status: "active" | "terminee") {
    if (!restaurantId || !selectedId) return;
    startTransition(async () => {
      await updateCampaignStatusAction(restaurantId, selectedId, status);
      router.refresh();
    });
  }

  const filtered = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          (statusFilter === "all" || c.status === statusFilter) &&
          (channelFilter === "all" || c.channel === channelFilter)
      ),
    [campaigns, statusFilter, channelFilter]
  );

  const selected: Campaign | undefined = campaigns.find((c) => c.id === selectedId);

  return (
    <div>
      <PageHeader
        eyebrow="Campagnes & contenu"
        title="Campaigns"
        description="Posts, emails et promotions — et leur corrélation avec les revenus qui suivent."
        action={
          canCreate && (
            <Button size="sm" href="/campaigns/new">
              <Plus size={15} /> Nouvelle campagne
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Select
          className="w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | CampaignStatus)}
        >
          <option value="all">Tous les statuts</option>
          {(Object.keys(statusLabel) as CampaignStatus[]).map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as "all" | CampaignChannel)}
        >
          <option value="all">Tous les canaux</option>
          {(Object.keys(channelIcon) as CampaignChannel[]).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <span className="text-[12.5px] text-mv-ink-faint">
          {filtered.length} campagne{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={selected ? "xl:col-span-7" : "xl:col-span-12"}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Aucune campagne ne correspond"
              description="Ajustez les filtres ou créez une nouvelle campagne."
              action={
                canCreate && (
                  <Button size="sm" href="/campaigns/new">
                    <Plus size={15} /> Nouvelle campagne
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <THead>
                <Th>Campagne</Th>
                <Th>Canal</Th>
                <Th>Dates</Th>
                <Th>Statut</Th>
                <Th className="text-right">Résultat</Th>
              </THead>
              <tbody>
                {filtered.map((c) => {
                  const Icon = channelIcon[c.channel];
                  return (
                    <Tr key={c.id} onClick={() => setSelectedId(c.id)} active={c.id === selectedId}>
                      <Td>
                        <p className="font-semibold text-mv-ink">{c.name}</p>
                        <p className="text-[11.5px] text-mv-ink-faint">{typeLabel[c.type]}</p>
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5 text-mv-ink-soft">
                          <Icon size={14} /> {c.channel}
                        </span>
                      </Td>
                      <Td className="text-mv-ink-soft">
                        {formatDate(c.startDate)} — {formatDate(c.endDate)}
                      </Td>
                      <Td>
                        <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
                      </Td>
                      <Td className="text-right">
                        <p className="font-semibold text-mv-ink">
                          {c.estimatedRevenue > 0 ? formatCurrency(c.estimatedRevenue) : "—"}
                        </p>
                        <Badge tone={impactTone[c.impact]} className="mt-1">
                          Impact {c.impact}
                        </Badge>
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
                  <Badge tone="neutral">{typeLabel[selected.type]}</Badge>
                  <Badge tone={statusTone[selected.status]}>{statusLabel[selected.status]}</Badge>
                </div>
                <h2 className="font-display text-[19px] font-medium text-mv-ink">{selected.name}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-mv-ink-soft">
                  {selected.description}
                </p>

                {canCreate && selected.status !== "terminee" && (
                  <div className="mt-3">
                    {selected.status === "planifiee" ? (
                      <Button size="sm" variant="secondary" disabled={isPending} onClick={() => handleStatusChange("active")}>
                        Démarrer la campagne
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled={isPending} onClick={() => handleStatusChange("terminee")}>
                        Terminer la campagne
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-mv-cream-soft p-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">Visites</p>
                    <p className="font-display text-[16px] font-medium text-mv-ink">
                      {selected.visites.toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-mv-ink-faint">
                      Revenu corrélé
                    </p>
                    <p className="font-display text-[16px] font-medium text-mv-green-dark">
                      {formatCurrency(selected.estimatedRevenue)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Timeline" description="Étapes clés de la campagne" />
                {selected.timeline.length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">
                    Cette campagne n&apos;a pas encore démarré.
                  </p>
                ) : (
                  <div className="space-y-0">
                    {selected.timeline.map((t, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-mv-green" />
                          {i < selected.timeline.length - 1 && (
                            <span className="w-px flex-1 bg-mv-border" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-[11.5px] font-semibold text-mv-ink-faint">
                            {formatDate(t.date)}
                          </p>
                          <p className="text-[13px] text-mv-ink">{t.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {assets.length > 0 && (
                <Card>
                  <CardHeader title="Pièces jointes" description={`${assets.length} fichier(s)`} />
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {assets.map((a) =>
                      a.kind === "image" && a.url ? (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="aspect-square overflow-hidden rounded-lg border border-mv-border bg-mv-cream-soft"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.url} alt={a.fileName} className="h-full w-full object-cover" />
                        </a>
                      ) : (
                        <a
                          key={a.id}
                          href={a.url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="col-span-2 flex items-center gap-2 rounded-lg border border-mv-border bg-mv-cream-soft px-2.5 py-2 text-[12px] text-mv-ink-soft hover:bg-mv-surface sm:col-span-4"
                        >
                          <FileText size={14} className="shrink-0 text-mv-ink-faint" />
                          <span className="truncate">{a.fileName}</span>
                        </a>
                      )
                    )}
                  </div>
                </Card>
              )}

              <Card>
                <CardHeader title="Notes du consultant" description={`${selected.notes.length} note(s)`} />
                {selected.notes.length === 0 ? (
                  <p className="text-[12.5px] text-mv-ink-faint">Aucune note pour l&apos;instant.</p>
                ) : (
                  <div className="space-y-3">
                    {selected.notes.map((n, i) => (
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

    </div>
  );
}
