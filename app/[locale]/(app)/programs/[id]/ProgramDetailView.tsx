"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Campaign, Customer, FinancialTransaction, Program, ProgramStatus, ProgramType, ServiceDay } from "@/lib/types";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Receipt,
  Megaphone,
  CalendarCheck,
  Users,
  Sparkles,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useApp } from "@/lib/app-context";
import { useState, useTransition } from "react";
import { updateProgramStatusAction, createProgramNoteAction } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const typeLabel: Record<ProgramType, string> = {
  brunch: "Brunch récurrent",
  soiree: "Soirée thématique",
  saison: "Période saisonnière",
  evenement: "Événement spécial",
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

export function ProgramDetailView({
  restaurantId,
  program,
  transactions,
  campaigns,
  serviceDays,
  regularCustomers,
}: {
  restaurantId: string;
  program: Program;
  transactions: FinancialTransaction[];
  campaigns: Campaign[];
  serviceDays: ServiceDay[];
  regularCustomers: Customer[];
}) {
  const { role } = useApp();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const canManage = role === "owner" || role === "manager";

  // Financial calculations
  const margin = program.revenue > 0 ? program.revenue - program.cost : 0;
  const marginPct = program.revenue > 0 ? Math.round((margin / program.revenue) * 100) : 0;
  const revenueGoalPct = program.revenueGoal ? Math.min(100, Math.round((program.revenue / program.revenueGoal) * 100)) : null;

  function handleStatusChange(status: ProgramStatus) {
    startTransition(async () => {
      const updated = await updateProgramStatusAction(restaurantId, program.id, status);
      if (updated) {
        toast.success(`Statut mis à jour : ${statusLabel[status]}`);
        router.refresh();
      } else {
        toast.error("La mise à jour du statut a échoué.");
      }
    });
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const note = await createProgramNoteAction(restaurantId, program.id, noteText.trim());
      if (note) {
        setNoteText("");
        toast.success("Note ajoutée");
        router.refresh();
      } else {
        toast.error("Impossible d'ajouter la note.");
      }
    } finally {
      setIsSubmittingNote(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl w-full">
      {/* Back button */}
      <div className="mb-4">
        <Button href="/programs" variant="ghost" size="sm" className="gap-1.5 text-mv-ink-soft">
          <ArrowLeft size={14} /> Tous les revenus récurrents
        </Button>
      </div>

      {/* Header */}
      <PageHeader
        eyebrow="Programme de revenu récurrent"
        title={program.name}
        description={`${typeLabel[program.type]} · Du ${formatDate(program.startDate)} au ${formatDate(program.endDate)}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={typeTone[program.type]} className="text-[12px] px-2.5 py-0.5">
              {typeLabel[program.type]}
            </Badge>
            {canManage ? (
              <select
                value={program.status}
                disabled={isPending}
                onChange={(e) => handleStatusChange(e.target.value as ProgramStatus)}
                className="h-8 rounded-lg border border-mv-border bg-mv-surface px-2.5 text-[12px] font-semibold text-mv-ink focus:outline-none focus:ring-1 focus:ring-mv-green"
              >
                <option value="actif">Actif</option>
                <option value="planifie">Planifié</option>
                <option value="termine">Terminé</option>
              </select>
            ) : (
              <Badge tone={statusTone[program.status]} className="text-[12px] px-2.5 py-0.5">
                {statusLabel[program.status]}
              </Badge>
            )}
          </div>
        }
      />

      {/* Objective callout if available */}
      {program.objective && (
        <div className="mb-6 rounded-2xl border border-mv-border bg-mv-surface p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">Objectif stratégique</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-mv-ink-soft">{program.objective}</p>
        </div>
      )}

      {/* Financial & Performance KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Revenu récurrent</p>
          <p className="mt-1 font-display text-[24px] font-medium text-mv-green-dark">
            {formatCurrency(program.revenue)}
          </p>
          {program.revenueGoal ? (
            <div className="mt-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-mv-border-soft">
                <div className="h-full bg-mv-green" style={{ width: `${revenueGoalPct}%` }} />
              </div>
              <p className="mt-1 text-[10.5px] text-mv-ink-faint">
                {revenueGoalPct}% de l&apos;objectif ({formatCurrency(program.revenueGoal)})
              </p>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-mv-ink-faint">Ventes cumulées</p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Coûts directs</p>
          <p className="mt-1 font-display text-[24px] font-medium text-mv-ink">
            {formatCurrency(program.cost)}
          </p>
          <p className="mt-1 text-[11px] text-mv-ink-faint">
            {program.expectedCost ? `Budget prévu : ${formatCurrency(program.expectedCost)}` : "Dépenses engagées"}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Marge brute</p>
          <p className="mt-1 font-display text-[24px] font-medium text-mv-ink">
            {formatCurrency(margin)}
          </p>
          <p className="mt-1 text-[11px] text-mv-ink-soft">
            <span className={marginPct >= 40 ? "text-mv-green-dark font-medium" : "text-mv-ink"}>
              {marginPct}% de rentabilité
            </span>
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">Services associés</p>
          <p className="mt-1 font-display text-[24px] font-medium text-mv-ink">
            {serviceDays.length}
          </p>
          <p className="mt-1 text-[11px] text-mv-ink-faint">
            Journées d&apos;activité
          </p>
        </Card>
      </div>

      {/* 4 Connected Systems Grid */}
      <div className="space-y-6">
        <h2 className="font-display text-[20px] font-medium text-mv-ink">
          Systèmes connectés à ce programme
        </h2>

        {/* System 1: Finance */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-mv-border-soft pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mv-green-tint text-mv-green-dark">
                <Receipt size={16} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-mv-ink">Système 1 — Finance & Comptabilité</p>
                <p className="text-[11.5px] text-mv-ink-faint">Transactions financières et écritures taguées</p>
              </div>
            </div>
            <Button href="/finance" variant="secondary" size="sm" className="text-[12px] gap-1">
              Ouvrir la Finance <ArrowUpRight size={12} />
            </Button>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-mv-border p-4 text-center text-mv-ink-soft text-[12.5px]">
              Aucune transaction financière n&apos;est actuellement rattachée à ce programme.
              <p className="mt-1 text-[11px] text-mv-ink-faint">
                Dans la section Finance, associez des écritures à « {program.name} » pour suivre les flux précis.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-mv-border text-[11px] font-semibold uppercase text-mv-ink-faint">
                    <th className="py-2">Date</th>
                    <th className="py-2">Description</th>
                    <th className="py-2">Catégorie</th>
                    <th className="py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mv-border-soft">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2 text-mv-ink-faint">{formatDate(t.date)}</td>
                      <td className="py-2 font-medium text-mv-ink">{t.description}</td>
                      <td className="py-2">
                        <Badge tone="neutral" className="text-[10.5px]">
                          {t.category}
                        </Badge>
                      </td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          t.direction === "in" ? "text-mv-green-dark" : "text-mv-ink"
                        }`}
                      >
                        {t.direction === "in" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* System 2: Marketing & Campaigns */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-mv-border-soft pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mv-lime/30 text-mv-lime-dark">
                <Megaphone size={16} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-mv-ink">Système 2 — Marketing & Acquisition</p>
                <p className="text-[11.5px] text-mv-ink-faint">Campagnes actives et acquisition d&apos;abonnés</p>
              </div>
            </div>
            <Button href="/campaigns" variant="secondary" size="sm" className="text-[12px] gap-1">
              Toutes les campagnes <ArrowUpRight size={12} />
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-mv-border p-4 text-center text-mv-ink-soft text-[12.5px]">
              Aucune campagne publicitaire n&apos;est liée à ce programme récurrent.
              <p className="mt-1 text-[11px] text-mv-ink-faint">
                Créez une campagne de relance ou d&apos;acquisition ciblée sur ce programme.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-mv-border bg-mv-surface p-3 text-[12.5px]"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-mv-ink">{c.name}</p>
                    <Badge tone={c.status === "active" ? "green" : "neutral"} className="text-[10px]">
                      {c.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11.5px] text-mv-ink-faint">
                    Canal : {c.channel} · {c.visites} visites générées
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* System 3: Operations & Service Days */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-mv-border-soft pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mv-cream-soft text-mv-green-dark border border-mv-border">
                <CalendarCheck size={16} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-mv-ink">Système 3 — Opérations & Performance Quotidienne</p>
                <p className="text-[11.5px] text-mv-ink-faint">Services exécutés durant la période de ce programme</p>
              </div>
            </div>
            <Button href="/days" variant="secondary" size="sm" className="text-[12px] gap-1">
              Performance quotidienne <ArrowUpRight size={12} />
            </Button>
          </div>

          {serviceDays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-mv-border p-4 text-center text-mv-ink-soft text-[12.5px]">
              Aucune journée de service enregistrée sur la plage de dates de ce programme ({formatDate(program.startDate)} — {formatDate(program.endDate)}).
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {serviceDays.slice(0, 6).map((sd) => (
                <Link
                  key={sd.id}
                  href={`/days/${sd.id}`}
                  className="group block rounded-xl border border-mv-border bg-mv-surface p-3 transition-colors hover:border-mv-green hover:bg-mv-cream-soft"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-medium text-mv-ink">{formatDate(sd.date)}</p>
                    <Badge tone={sd.rushLevel === "rush" || sd.anomaly === "rush" ? "green" : "neutral"} className="text-[10px]">
                      {sd.rushLevel || "Normal"}
                    </Badge>
                  </div>
                  <p className="mt-1.5 font-display text-[16px] font-semibold text-mv-green-dark">
                    {formatCurrency(sd.revenue)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-mv-ink-faint group-hover:text-mv-green-dark">
                    Voir le service &rarr;
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* System 4: Loyalty & Regular Customers */}
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-mv-border-soft pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mv-amber-bg text-mv-amber">
                <Users size={16} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-mv-ink">Système 4 — Fidélisation & Abonnés Récurents</p>
                <p className="text-[11.5px] text-mv-ink-faint">Clientèle régulière générant le chiffre d&apos;affaires de récurrence</p>
              </div>
            </div>
            <Button href="/fidelisation" variant="secondary" size="sm" className="text-[12px] gap-1">
              Fiches clients <ArrowUpRight size={12} />
            </Button>
          </div>

          {regularCustomers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-mv-border p-4 text-center text-mv-ink-soft text-[12.5px]">
              Aucun client récurrent répertorié pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {regularCustomers.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-mv-border bg-mv-surface p-3 text-[12.5px]"
                >
                  <p className="truncate font-semibold text-mv-ink">{c.name}</p>
                  <p className="text-[11px] text-mv-ink-faint">{c.visitCount} visites cumulées</p>
                  <p className="mt-1 font-semibold text-mv-green-dark">{formatCurrency(c.totalSpent)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Operational Notes */}
        <Card className="p-5">
          <CardHeader
            eyebrow="Journal d'exploitation"
            title="Notes & Retours de l'équipe"
            description="Observations opérationnelles laissées par le personnel"
          />

          {canManage && (
            <form onSubmit={handleAddNote} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ajouter une note sur ce programme..."
                  className="flex-1 rounded-xl border border-mv-border bg-mv-surface px-3 py-2 text-[13px] text-mv-ink placeholder:text-mv-ink-faint focus:outline-none focus:ring-1 focus:ring-mv-green"
                />
                <Button type="submit" size="sm" disabled={isSubmittingNote || !noteText.trim()}>
                  {isSubmittingNote ? "Enregistrement..." : "Ajouter"}
                </Button>
              </div>
            </form>
          )}

          {program.consultantNotes.length === 0 ? (
            <p className="text-[12.5px] text-mv-ink-faint">Aucune note enregistrée sur ce programme.</p>
          ) : (
            <div className="space-y-2">
              {program.consultantNotes.map((n, i) => (
                <div key={i} className="rounded-xl border border-mv-border bg-mv-cream-soft/70 p-3 text-[12.5px]">
                  <div className="flex items-center justify-between text-[11px] text-mv-ink-faint mb-1">
                    <span className="font-semibold text-mv-ink">{n.author}</span>
                    <span>{formatDate(n.date)}</span>
                  </div>
                  <p className="leading-relaxed text-mv-ink-soft">{n.text}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
