"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Camera, ExternalLink, RefreshCw } from "lucide-react";
import { disconnectAmbassadorInstagramAction } from "@/app/[locale]/(app)/workspace/actions";

type TrackerData = {
  account: { username: string | null; accountType: string | null; followers: number | null; mediaCount: number | null };
  videos: { id: string; caption: string; permalink: string; timestamp: string | null; metrics: Record<string, number> }[];
  metricsUpdatedAt: string;
};

const metricLabels: Record<string, string> = {
  views: "Vues", reach: "Comptes touchés", likes: "J’aime", comments: "Commentaires",
  saved: "Enregistrements", shares: "Partages", total_interactions: "Interactions",
};

export function AmbassadorInstagramTracker({ connection }: { connection: { username: string | null; expiresAt: string | null } | null }) {
  const [data, setData] = useState<TrackerData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const router = useRouter();
  const connected = Boolean(connection) && !disconnected;

  async function loadInsights() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/portal/ambassador/instagram", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Statistiques Instagram indisponibles.");
      setData(body as TrackerData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Statistiques Instagram indisponibles.");
    } finally { setBusy(false); }
  }

  return <Card>
    <CardHeader eyebrow="Réseaux sociaux · Instagram" title="Mesurez les résultats de vos vidéos" description="Reliez un compte professionnel pour lire les données publiées par Meta, puis comparez-les aux clics et inscriptions attribués à chaque lien Minerva Flow." />
    {!connected ? <div className="flex flex-col gap-3 rounded-xl bg-mv-cream-soft p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-2xl text-[12px] leading-relaxed text-mv-ink-soft">Connexion réservée aux comptes Instagram Creator ou Business. Minerva Flow demandera l’accès au profil et aux statistiques des publications; vous pourrez retirer l’accès dans Instagram à tout moment.</p>
      <Link className={buttonVariants({ size: "sm" })} href="/api/oauth/instagram?mode=ambassador" prefetch={false}><Camera size={14} /> Connecter Instagram <ExternalLink size={13} /></Link>
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mv-cream-soft p-3">
        <div><p className="text-[12px] font-semibold text-mv-ink">Compte connecté · @{connection?.username ?? "Instagram"}</p><p className="mt-0.5 text-[11px] text-mv-ink-faint">Les statistiques sont chargées uniquement à votre demande. Reconnectez si Meta indique que l’autorisation a expiré.</p></div>
        <div className="flex flex-wrap gap-2"><Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/api/oauth/instagram?mode=ambassador" prefetch={false}>Reconnecter</Link><Button size="sm" variant="ghost" onClick={async () => { const ok = await disconnectAmbassadorInstagramAction(); if (ok) { setDisconnected(true); setData(null); router.refresh(); } else setError("Impossible de supprimer la connexion. Réessayez."); }}>Déconnecter</Button><Button size="sm" variant="secondary" onClick={loadInsights} loading={busy}><RefreshCw size={13} /> {data ? "Actualiser les statistiques" : "Charger les statistiques"}</Button></div>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}
      {data && <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Abonnés" value={data.account.followers} />
          <Metric label="Publications" value={data.account.mediaCount} />
          <Metric label="Vidéos repérées" value={data.videos.length} />
        </div>
        {data.videos.length ? <div className="divide-y divide-mv-border-soft">{data.videos.map((video) => <div key={video.id} className="py-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[12px] font-medium text-mv-ink">{video.caption || "Vidéo sans légende"}</p><p className="mt-1 text-[10.5px] text-mv-ink-faint">{video.timestamp ? new Date(video.timestamp).toLocaleDateString() : ""}</p></div>{video.permalink && <a className="shrink-0 text-[11px] text-mv-green-dark underline" href={video.permalink} target="_blank" rel="noreferrer">Ouvrir <ExternalLink size={11} className="inline" /></a>}</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-mv-ink-soft">{Object.entries(video.metrics).map(([key, value]) => <span key={key}><strong className="text-mv-ink">{value.toLocaleString()}</strong> {metricLabels[key] ?? key}</span>)}{!Object.keys(video.metrics).length && <span>Meta n’a pas fourni les statistiques pour cette vidéo.</span>}</div>
        </div>)}</div> : <p className="text-[12px] text-mv-ink-faint">Aucune vidéo récente repérée sur le compte.</p>}
        <p className="text-[10.5px] text-mv-ink-faint">Données récupérées {new Date(data.metricsUpdatedAt).toLocaleString()} · Le suivi des clics et des inscriptions vient des liens Minerva Flow associés à chaque vidéo.</p>
      </div>}
    </>}
  </Card>;
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft p-3"><p className="text-[11px] text-mv-ink-faint">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-mv-ink">{value?.toLocaleString() ?? "—"}</p></div>;
}
