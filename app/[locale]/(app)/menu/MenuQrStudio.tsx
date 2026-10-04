"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("menu.qr");
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
    if (!value) { toast.error(t("createFailed")); return; }
    setShare(value);
    toast.success(t("linkReady"));
  }

  async function shareMenu() {
    if (!url) return;
    if (navigator.share) await navigator.share({ title: t("shareMenuTitle"), url }).catch(() => {});
    else { await navigator.clipboard.writeText(url); toast.success(t("linkCopied")); }
  }

  async function shareInstallGuide() {
    if (!installUrl) return;
    const name = restaurantName ?? t("installShareFallbackName");
    if (navigator.share) await navigator.share({ title: t("installShareTitle", { restaurantName: name }), text: t("installShareText", { restaurantName: name }), url: installUrl }).catch(() => {});
    else { await navigator.clipboard.writeText(installUrl); toast.success(t("installLinkCopied")); }
  }

  function printQr() {
    if (!qr || !url) return;
    const printable = window.open("", "_blank", "width=680,height=760");
    if (!printable) { toast.error(t("printBlocked")); return; }
    printable.document.write(`<!doctype html><html><head><title>${t("printPageTitle")}</title><style>body{font-family:Arial,sans-serif;display:grid;place-items:center;min-height:90vh;color:#1a1e16}.card{text-align:center;padding:32px;border:1px solid #ddd;border-radius:24px;width:440px}img{width:300px;height:300px}.url{word-break:break-all;color:#555;font-size:14px}@media print{button{display:none}}</style></head><body><main class="card"><h1>${t("printHeading")}</h1><img src="${qr}" alt="${t("printImageAlt")}"><p>${t("printScanHint")}</p><p class="url">${url}</p><button onclick="window.print()">${t("printButton")}</button></main></body></html>`);
    printable.document.close();
  }

  return <div>
    <MenuStudioNav active="qr" />
    <PageHeader eyebrow="Flow Direct" title={t("title")} description={t("description")} />
    {!restaurantId ? <EmptyState icon={QrCode} title={t("noRestaurantTitle")} description={t("noRestaurantDescription")} /> : !share ? <Card className="p-8"><EmptyState icon={QrCode} title={t("noLinkTitle")} description={t("noLinkDescription")} action={<Button onClick={createDefault} disabled={creating}>{creating ? t("creating") : t("createLink")}</Button>} /></Card> : (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[.14em] text-mv-green-dark">{t("publicMenuLabel")}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-mv-ink">{share.title}</h2>
          <p className="mt-2 break-all rounded-xl bg-mv-cream-soft p-3 font-mono text-[12px] text-mv-ink-soft">{url}</p>
          <div className="mt-5 flex flex-wrap gap-2"><Button onClick={shareMenu}><Share2 size={15} />{t("shareMenu")}</Button><Button variant="secondary" onClick={() => { navigator.clipboard.writeText(url); toast.success(t("linkCopied")); }}><Copy size={15} />{t("copyLink")}</Button><Button variant="secondary" onClick={shareInstallGuide}><ExternalLink size={15} />{t("shareInstallGuide")}</Button><Button variant="secondary" onClick={() => { if (installUrl) { navigator.clipboard.writeText(installUrl); toast.success(t("installLinkCopied")); } }}><Copy size={15} />{t("copyInstallLink")}</Button><Button variant="secondary" onClick={printQr}><Printer size={15} />{t("printQr")}</Button><a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-mv-border px-3 text-sm font-medium text-mv-ink"><ExternalLink size={15} />{t("openMenu")}</a></div>
          <p className="mt-5 text-[12px] text-mv-ink-faint">{t("publicNote")}</p>
        </Card>
        <Card className="flex flex-col items-center p-6 text-center"><h2 className="font-display text-lg font-semibold text-mv-ink">{t("toDisplayTitle")}</h2>{qr ? <Image src={qr} alt={t("qrImageAlt")} width={256} height={256} unoptimized className="mt-4 aspect-square w-64 rounded-xl border border-mv-border-soft p-2" /> : <div className="mt-4 h-64 w-64 animate-pulse rounded-xl bg-mv-cream-soft" />}<Button variant="secondary" className="mt-4" disabled={!qr} onClick={() => { if (!qr) return; const a = document.createElement("a"); a.href = qr; a.download = `menu-${share.token}.png`; a.click(); }}><Download size={15} />{t("downloadQr")}</Button><p className="mt-3 text-[12px] text-mv-ink-faint">{t("downloadHint")}</p></Card>
      </div>
    )}
  </div>;
}
