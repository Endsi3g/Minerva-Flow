"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MenuStudioNav } from "./MenuStudioNav";
import { ensureDefaultMenuShareAction } from "./actions";
import type { MenuShare } from "@/lib/types";
import { Copy, Download, ExternalLink, Printer, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";

export function MenuQrStudio({ restaurantId, restaurantName, initialShares }: { restaurantId: string | null; restaurantName: string | null; initialShares: MenuShare[] }) {
  const [share, setShare] = useState(initialShares.find((candidate) => !candidate.itemIds?.length) ?? null);
  const [qr, setQr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const url = share ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app"}/m/${share.token}` : "";
  const installUrl = share && restaurantId
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app"}/app?restaurant=${encodeURIComponent(restaurantId)}&name=${encodeURIComponent(restaurantName ?? "")}&menu=${encodeURIComponent(share.token)}`
    : "";

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 720, margin: 2, errorCorrectionLevel: "H" }).then(setQr).catch(() => setQr(null));
  }, [url]);

  async function createDefault() {
    if (!restaurantId) return;
    setCreating(true);
    const value = await ensureDefaultMenuShareAction(restaurantId);
    setCreating(false);
    if (!value) { toast.error("Le lien du menu n’a pas pu être créé."); return; }
    setShare(value);
    toast.success("Le lien public du menu est prêt.");
  }

  async function shareMenu() {
    if (!url) return;
    if (navigator.share) await navigator.share({ title: "Menu du restaurant", url }).catch(() => {});
    else { await navigator.clipboard.writeText(url); toast.success("Lien copié."); }
  }

  async function shareInstallGuide() {
    if (!installUrl) return;
    if (navigator.share) await navigator.share({ title: `Installer Minerva Flow · ${restaurantName ?? "restaurant"}`, text: `Retrouvez le menu, vos commandes et vos points pour ${restaurantName ?? "ce restaurant"}.`, url: installUrl }).catch(() => {});
    else { await navigator.clipboard.writeText(installUrl); toast.success("Lien d’installation copié."); }
  }

  function printQr() {
    if (!qr || !url) return;
    const printable = window.open("", "_blank", "width=680,height=760");
    if (!printable) { toast.error("Autorisez la fenêtre d’impression puis réessayez."); return; }
    printable.document.write(`<!doctype html><html><head><title>QR — Menu</title><style>body{font-family:Arial,sans-serif;display:grid;place-items:center;min-height:90vh;color:#1a1e16}.card{text-align:center;padding:32px;border:1px solid #ddd;border-radius:24px;width:440px}img{width:300px;height:300px}.url{word-break:break-all;color:#555;font-size:14px}@media print{button{display:none}}</style></head><body><main class="card"><h1>Menu numérique</h1><img src="${qr}" alt="Code QR vers le menu"><p>Scannez pour consulter le menu et commander.</p><p class="url">${url}</p><button onclick="window.print()">Imprimer</button></main></body></html>`);
    printable.document.close();
  }

  return <div>
    <MenuStudioNav active="QR et partage" />
    <PageHeader eyebrow="Flow Direct" title="QR code et diffusion" description="Un seul menu, prêt à publier sur vos réseaux, à envoyer par message ou à imprimer pour le comptoir et les tables." />
    {!restaurantId ? <EmptyState icon={QrCode} title="Aucun restaurant sélectionné" description="Choisissez un établissement dans votre espace." /> : !share ? <Card className="p-8"><EmptyState icon={QrCode} title="Votre lien de menu n’est pas encore créé" description="Générez le lien public pour obtenir le QR code, le partager et lancer l’impression." action={<Button onClick={createDefault} disabled={creating}>{creating ? "Création…" : "Créer le lien et le QR"}</Button>} /></Card> : (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-mv-green-dark">Menu public</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-mv-ink">{share.title}</h2>
          <p className="mt-2 break-all rounded-xl bg-mv-cream-soft p-3 font-mono text-[12px] text-mv-ink-soft">{url}</p>
          <div className="mt-5 flex flex-wrap gap-2"><Button onClick={shareMenu}><Share2 size={15} />Partager le menu</Button><Button variant="secondary" onClick={() => { navigator.clipboard.writeText(url); toast.success("Lien copié."); }}><Copy size={15} />Copier le lien</Button><Button variant="secondary" onClick={shareInstallGuide}><ExternalLink size={15} />Partager la page d’installation</Button><Button variant="secondary" onClick={() => { if (installUrl) { navigator.clipboard.writeText(installUrl); toast.success("Lien d’installation copié."); } }}><Copy size={15} />Copier le lien d’installation</Button><Button variant="secondary" onClick={printQr}><Printer size={15} />Imprimer le QR</Button><a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-mv-border px-3 text-sm font-medium text-mv-ink"><ExternalLink size={15} />Ouvrir le menu</a></div>
          <p className="mt-5 text-[12px] text-mv-ink-faint">Le menu public affiche uniquement les articles actifs. Les brouillons restent privés.</p>
        </Card>
        <Card className="flex flex-col items-center p-6 text-center"><h2 className="font-display text-lg font-semibold text-mv-ink">À imprimer ou afficher</h2>{qr ? <Image src={qr} alt="QR code du menu" width={256} height={256} unoptimized className="mt-4 aspect-square w-64 rounded-xl border border-mv-border-soft p-2" /> : <div className="mt-4 h-64 w-64 animate-pulse rounded-xl bg-mv-cream-soft" />}<Button variant="secondary" className="mt-4" disabled={!qr} onClick={() => { if (!qr) return; const a = document.createElement("a"); a.href = qr; a.download = `menu-${share.token}.png`; a.click(); }}><Download size={15} />Télécharger le QR</Button><p className="mt-3 text-[11.5px] text-mv-ink-faint">Ajoutez-le à votre vitrine, vos tables ou vos publications.</p></Card>
      </div>
    )}
  </div>;
}
