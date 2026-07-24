"use client";

import { useState } from "react";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Copy, Check, QrCode, Globe, Code, ExternalLink, Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function DirectOrderingWidgetGenerator({
  restaurantName,
  menuToken,
}: {
  restaurantName: string;
  menuToken: string;
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [copiedButton, setCopiedButton] = useState(false);
  const [tableNumber, setTableNumber] = useState("1");
  const [widgetHeight, setWidgetHeight] = useState("700");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://minerva-flow.vercel.app";
  const publicMenuUrl = `${baseUrl}/m/${menuToken}`;
  const tableQrUrl = `${publicMenuUrl}?table=${tableNumber}`;

  const iframeSnippet = `<iframe
  src="${publicMenuUrl}"
  width="100%"
  height="${widgetHeight}px"
  style="border:none; border-radius:16px; box-shadow:0 4px 20px rgba(0,0,0,0.08);"
  title="Commander en ligne chez ${restaurantName}"
></iframe>`;

  const buttonSnippet = `<a 
  href="${publicMenuUrl}" 
  target="_blank" 
  style="display:inline-block; background-color:#167f5b; color:#ffffff; font-family:sans-serif; font-weight:600; font-size:15px; padding:12px 24px; border-radius:12px; text-decoration:none; box-shadow:0 2px 8px rgba(22,127,91,0.3);"
>
  🛒 Commander directement (0% Commission)
</a>`;

  async function handleCopy(text: string, type: "link" | "iframe" | "button") {
    await navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else if (type === "iframe") {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    } else {
      setCopiedButton(true);
      setTimeout(() => setCopiedButton(false), 2000);
    }
    toast.success("Copié dans le presse-papier !");
  }

  function handlePrintQr() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="p-5 border-mv-green/30 bg-gradient-to-r from-mv-green/5 via-white to-mv-cream/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-mv-green text-white text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                0% Commission
              </span>
              <h3 className="font-display text-[18px] font-semibold text-mv-ink">
                Canal de Commande Directe & Click & Collect
              </h3>
            </div>
            <p className="text-[13px] text-mv-ink-soft max-w-2xl">
              Remplacez Uber Eats et DoorDash (20–30% de frais) en intégrant le widget de commande directe Flow sur votre site web et en imprimant vos QR codes de table.
            </p>
          </div>

          <a href={publicMenuUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" className="whitespace-nowrap">
              <ExternalLink size={14} /> Prévisualiser le portail
            </Button>
          </a>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Embed Widget Code Generator */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-mv-ink">
            <Code size={18} className="text-mv-green-dark" />
            <h4 className="font-semibold text-[15px]">Widget Web Embarquable (iFrame & Bouton)</h4>
          </div>
          <p className="text-[12.5px] text-mv-ink-soft">
            Copiez-collez ce code dans votre site Wix, WordPress, Squarespace ou Shopify pour intégrer la commande directe.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-mv-ink-soft">Option A : Widget complet (iFrame)</span>
                <button
                  onClick={() => handleCopy(iframeSnippet, "iframe")}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-mv-green-dark hover:underline"
                >
                  {copiedIframe ? <Check size={13} /> : <Copy size={13} />}
                  {copiedIframe ? "Copié !" : "Copier iFrame"}
                </button>
              </div>
              <pre className="p-3 bg-mv-ink text-mv-cream-soft rounded-xl text-[11.5px] font-mono overflow-x-auto whitespace-pre-wrap">
                {iframeSnippet}
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold text-mv-ink-soft">Option B : Bouton « Commander »</span>
                <button
                  onClick={() => handleCopy(buttonSnippet, "button")}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-mv-green-dark hover:underline"
                >
                  {copiedButton ? <Check size={13} /> : <Copy size={13} />}
                  {copiedButton ? "Copié !" : "Copier HTML"}
                </button>
              </div>
              <pre className="p-3 bg-mv-ink text-mv-cream-soft rounded-xl text-[11.5px] font-mono overflow-x-auto whitespace-pre-wrap">
                {buttonSnippet}
              </pre>
            </div>
          </div>
        </Card>

        {/* 2. QR Code Generator for Tables */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-mv-ink">
            <QrCode size={18} className="text-mv-green-dark" />
            <h4 className="font-semibold text-[15px]">Générateur de QR Code pour Table / Comptoir</h4>
          </div>
          <p className="text-[12.5px] text-mv-ink-soft">
            Imprimez des chevalets de table permettant à vos clients de commander directement depuis leur smartphone.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center border border-mv-border-soft rounded-xl p-4 bg-mv-cream/30">
            {/* Simulated printable QR badge */}
            <div className="w-36 h-44 bg-white border border-mv-border rounded-xl p-3 shadow-mv-sm flex flex-col items-center justify-between text-center print:w-full print:h-auto print:border-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mv-green-dark">
                {restaurantName}
              </span>
              <div className="w-20 h-20 bg-mv-ink/5 rounded-lg border border-mv-border flex items-center justify-center p-1">
                <QrCode size={56} className="text-mv-ink" />
              </div>
              <div className="text-[10.5px] font-bold text-mv-ink">
                Table #{tableNumber || "1"}
              </div>
            </div>

            <div className="flex-1 space-y-3 w-full">
              <Field label="Numéro de Table">
                <Input
                  type="number"
                  min="1"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Ex : 1, 2, 3..."
                />
              </Field>

              <div className="pt-1 flex flex-col gap-2">
                <Button size="sm" onClick={handlePrintQr} className="w-full">
                  <Printer size={14} /> Imprimer le chevalet de table
                </Button>
                <button
                  onClick={() => handleCopy(tableQrUrl, "link")}
                  className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-mv-ink-soft hover:text-mv-ink py-1"
                >
                  {copiedLink ? <Check size={13} className="text-mv-green-dark" /> : <Copy size={13} />}
                  Copier le lien direct de la table
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
