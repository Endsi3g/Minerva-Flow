"use client";

import { Badge } from "@/components/ui/Badge";
import { Table, THead, Th, Tr, Td } from "@/components/minerva/DataTable";
import { useApp } from "@/lib/app-context";
import { formatDate } from "@/lib/utils";
import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getReferralModalDataAction,
  getReferralsListAction,
} from "@/app/(chat)/assistant/referral-actions";
import type { Referral, ReferralStatus } from "@/lib/types";

const statusTone: Record<ReferralStatus, "green" | "amber" | "neutral" | "red"> = {
  pending: "amber",
  active: "green",
  rewarded: "green",
  expired: "neutral",
};

const statusLabel: Record<ReferralStatus, string> = {
  pending: "En attente",
  active: "Actif",
  rewarded: "Récompensé",
  expired: "Expiré",
};

export function ReferralSettingsTab() {
  const { restaurantId } = useApp();
  const [code, setCode] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    pendingCount: number;
    activeCount: number;
    freeMonthsApplied: number;
  } | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    getReferralModalDataAction(restaurantId).then((data) => {
      setCode(data.code);
      setSummary(data);
    });
    getReferralsListAction(restaurantId).then(setReferrals);
  }, [restaurantId]);

  const link = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/sign-up?ref=${code}` : null;

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Minerva Flow",
          text: "Je gère mon restaurant avec Minerva Flow — inscris-toi avec mon lien :",
          url: link,
        });
      } catch {
        // L'utilisateur a annulé le partage — rien à faire.
      }
    } else {
      copyLink();
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-mv-border bg-mv-surface p-5 shadow-mv-sm">
        <p className="mb-1 font-display text-[16px] font-medium text-mv-ink">Programme de parrainage</p>
        <p className="mb-3 text-[13px] text-mv-ink-soft">
          Partagez ce lien avec d&apos;autres restaurants et cafés — vous obtenez un mois gratuit sur
          votre abonnement pour chaque inscription qui devient active.
        </p>
        {code && link ? (
          <div className="flex items-center gap-2 rounded-lg border border-mv-border bg-mv-cream-soft px-3 py-2.5">
            <span className="flex-1 truncate text-[13px] text-mv-ink">{link}</span>
            <button
              onClick={shareLink}
              aria-label="Partager le lien"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
            >
              <Share2 size={14} />
            </button>
            <button
              onClick={copyLink}
              aria-label="Copier le lien"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-mv-ink-soft transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
            >
              {copied ? <Check size={14} className="text-mv-green-dark" /> : <Copy size={14} />}
            </button>
          </div>
        ) : (
          <p className="text-[13px] text-mv-ink-faint">
            Seul un propriétaire ou un gérant peut générer ce lien.
          </p>
        )}
        {summary && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-mv-cream-soft p-2.5 text-center">
              <p className="font-display text-[17px] font-medium text-mv-ink">{summary.pendingCount}</p>
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">En attente</p>
            </div>
            <div className="rounded-lg bg-mv-cream-soft p-2.5 text-center">
              <p className="font-display text-[17px] font-medium text-mv-ink">{summary.activeCount}</p>
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">Actifs</p>
            </div>
            <div className="rounded-lg bg-mv-cream-soft p-2.5 text-center">
              <p className="font-display text-[17px] font-medium text-mv-ink">
                {summary.freeMonthsApplied}
              </p>
              <p className="text-[10.5px] font-semibold uppercase text-mv-ink-faint">Mois gratuits</p>
            </div>
          </div>
        )}
      </div>

      {referrals.length > 0 && (
        <Table>
          <THead>
            <Th>Filleul</Th>
            <Th>Statut</Th>
            <Th>Date</Th>
          </THead>
          <tbody>
            {referrals.map((r) => (
              <Tr key={r.id}>
                <Td>{r.referredEmail}</Td>
                <Td>
                  <Badge tone={statusTone[r.status]} dot>
                    {statusLabel[r.status]}
                  </Badge>
                </Td>
                <Td className="text-mv-ink-soft">{formatDate(r.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
