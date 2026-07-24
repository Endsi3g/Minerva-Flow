"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/minerva/FormField";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { updateCampaignStatusAction, getCampaignAssetsAction } from "@/app/[locale]/(app)/campaigns/actions";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Campaign, CampaignAsset, CampaignChannel, CampaignStatus, CampaignType } from "@/lib/types";
import { MarketingStudioView } from "./MarketingStudioView";
import { Sparkles, Megaphone, Plus, Camera, Mail, Store, Users, FileText } from "lucide-react";
import posthog from "posthog-js";
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
  initialSelectedId,
  initialChannel,
}: {
  restaurantId: string | null;
  campaigns: Campaign[];
  initialSelectedId?: string;
  initialChannel?: string;
}) {
  const { role } = useApp();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"studio" | "campaigns">("studio");
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatus>("all");
  const [channelFilter, setChannelFilter] = useState<"all" | CampaignChannel>(
    initialChannel && ["Instagram", "Email", "En salle", "Facebook"].includes(initialChannel)
      ? (initialChannel as CampaignChannel)
      : "all"
  );
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(id: string) {
    setSelectedId(id);
    router.push(`/campaigns?id=${id}`, { scroll: false });
  }

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
      posthog.capture("campaign_status_changed", {
        campaign_id: selectedId,
        new_status: status,
        campaign_name: selected?.name,
        campaign_channel: selected?.channel,
      });
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Marketing & Fidélisation"
        title="Studio Marketing & Campagnes"
        description="Créez des visuels ultra-personnalisés pour vos réseaux sociaux et gérez vos campagnes de relance."
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-mv-border bg-mv-surface p-1 shadow-mv-xs">
              <button
                onClick={() => setActiveTab("studio")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold rounded-lg transition-all ${
                  activeTab === "studio"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                }`}
              >
                <Sparkles size={14} /> Studio Visual Kits & Relances
              </button>
              <button
                onClick={() => setActiveTab("campaigns")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold rounded-lg transition-all ${
                  activeTab === "campaigns"
                    ? "bg-mv-green text-white shadow-sm"
                    : "text-mv-ink-soft hover:text-mv-ink hover:bg-mv-cream-soft"
                }`}
              >
                <Megaphone size={14} /> Toutes les Campagnes ({campaigns.length})
              </button>
            </div>

            {canCreate && (
              <Button size="sm" href="/campaigns/new">
                <Plus size={15} /> Nouvelle campagne
              </Button>
            )}
          </div>
        }
      />

      {activeTab === "studio" && <MarketingStudioView />}

      {activeTab === "campaigns" && (
        <div className="space-y-4">
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
                        <Tr key={c.id} onClick={() => handleSelect(c.id)} active={c.id === selectedId}>
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
                          <Td className="text-right font-medium text-mv-ink">
                            {c.estimatedRevenue ? (
                              <span className="text-mv-green-dark">+{formatCurrency(c.estimatedRevenue)}</span>
                            ) : (
                              "—"
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </div>

            {selected && (
              <div className="space-y-4 xl:col-span-5">
                <Card>
                  <CardHeader
                    eyebrow={selected.channel}
                    title={selected.name}
                    description={`${formatDate(selected.startDate)} — ${formatDate(selected.endDate)}`}
                    action={<Badge tone={statusTone[selected.status]}>{statusLabel[selected.status]}</Badge>}
                  />

                  {canCreate && (
                    <div className="mb-4 flex flex-wrap gap-2 border-b border-mv-border-soft pb-4">
                      {selected.status !== "active" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleStatusChange("active")}
                          disabled={isPending}
                        >
                          Marquer comme active
                        </Button>
                      )}
                      {selected.status !== "terminee" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStatusChange("terminee")}
                          disabled={isPending}
                        >
                          Terminer la campagne
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 text-[13px]">
                    <p className="text-mv-ink-soft">{selected.description}</p>



                    {selected.estimatedRevenue != null && (
                      <div className="flex justify-between border-t border-mv-border-soft pt-2.5">
                        <span className="text-mv-ink-faint">Revenu corrélé</span>
                        <span className="font-semibold text-mv-green-dark">
                          +{formatCurrency(selected.estimatedRevenue)}
                        </span>
                      </div>
                    )}

                    {selected.impact && (
                      <div className="flex justify-between border-t border-mv-border-soft pt-2.5">
                        <span className="text-mv-ink-faint">Impact global</span>
                        <Badge tone={impactTone[selected.impact]}>
                          {selected.impact.toUpperCase()}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>

                {assets.length > 0 && (
                  <Card>
                    <CardHeader title="Fichiers rattachés" description={`${assets.length} fichier(s)`} />
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {assets.map((a) =>
                        a.url && (a.mimeType.startsWith("image/") || a.kind === "image") ? (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
