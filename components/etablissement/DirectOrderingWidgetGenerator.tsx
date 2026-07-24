"use client";

import { useState } from "react";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import {
  Copy,
  Check,
  QrCode,
  Globe,
  Code,
  ExternalLink,
  Printer,
  Truck,
  Store,
  Zap,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type OrderMode = "clickcollect" | "table";

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
  const [orderMode, setOrderMode] = useState<OrderMode>("clickcollect");
  const [monthlySales, setMonthlySales] = useState("8000");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://minerva-flow.vercel.app";
  const publicMenuUrl = `${baseUrl}/m/${menuToken}`;
  const tableQrUrl = `${publicMenuUrl}?table=${tableNumber}`;

  const salesNum = parseFloat(monthlySales.replace(/[^0-9.]/g, "")) || 0;
  const uberEatsFees = salesNum * 0.27;
  const minervaFees = 0;
  const annualSavings = (uberEatsFees - minervaFees) * 12;

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
    const tableUrl =
      orderMode === "table"
        ? `${publicMenuUrl}?table=${tableNumber}`
        : publicMenuUrl;

    const modeLabel =
      orderMode === "table"
        ? `TABLE N° ${tableNumber || "1"}`
        : "CLICK & COLLECT";

    const modeSubLabel =
      orderMode === "table"
        ? "Scannez pour commander depuis votre table"
        : "Scannez pour commander à emporter";

    const printWindow = window.open("", "_blank", "width=600,height=800");
    if (!printWindow) {
      toast.error("Veuillez autoriser les pop-ups pour imprimer.");
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chevalet de table — ${restaurantName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playfair+Display:wght@600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #f7f4ee;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
    }
    
    .card {
      background: #ffffff;
      border-radius: 24px;
      width: 300px;
      padding: 32px 24px 28px;
      text-align: center;
      box-shadow: 0 8px 40px rgba(0,0,0,0.12);
      border: 1.5px solid #e8e2d4;
      position: relative;
      overflow: hidden;
    }
    
    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 6px;
      background: linear-gradient(90deg, #167f5b, #1fa874);
      border-radius: 24px 24px 0 0;
    }
    
    .restaurant-name {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 4px;
      letter-spacing: -0.3px;
    }
    
    .powered-by {
      font-size: 10px;
      color: #167f5b;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    
    .qr-frame {
      background: #f0faf5;
      border: 2px solid #167f5b;
      border-radius: 16px;
      padding: 16px;
      margin: 0 auto 20px;
      width: 172px;
      height: 172px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .qr-placeholder {
      width: 140px;
      height: 140px;
      background: #1a1a2e;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .qr-url {
      font-size: 9px;
      color: #888;
      word-break: break-all;
      margin-bottom: 16px;
      line-height: 1.4;
    }
    
    .mode-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #167f5b;
      color: white;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 8px 20px;
      border-radius: 50px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .mode-sub {
      font-size: 11.5px;
      color: #555;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    .divider {
      height: 1px;
      background: #e8e2d4;
      margin: 0 -24px 16px;
    }
    
    .zero-commission {
      font-size: 11px;
      color: #167f5b;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    
    .zero-commission span {
      font-size: 10px;
      color: #888;
      font-weight: 400;
    }
    
    @media print {
      body { background: white; padding: 0; }
      .card { box-shadow: none; border: 1px solid #ccc; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="restaurant-name">${restaurantName}</div>
    <div class="powered-by">Propulsé par Flow · Minerva</div>
    
    <div class="qr-frame">
      <div class="qr-placeholder">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- QR Code visual placeholder -->
          <rect x="8" y="8" width="44" height="44" rx="4" fill="white"/>
          <rect x="16" y="16" width="28" height="28" rx="2" fill="#1a1a2e"/>
          <rect x="22" y="22" width="16" height="16" rx="1" fill="white"/>
          <rect x="68" y="8" width="44" height="44" rx="4" fill="white"/>
          <rect x="76" y="16" width="28" height="28" rx="2" fill="#1a1a2e"/>
          <rect x="82" y="22" width="16" height="16" rx="1" fill="white"/>
          <rect x="8" y="68" width="44" height="44" rx="4" fill="white"/>
          <rect x="16" y="76" width="28" height="28" rx="2" fill="#1a1a2e"/>
          <rect x="22" y="82" width="16" height="16" rx="1" fill="white"/>
          <rect x="68" y="68" width="8" height="8" rx="1" fill="white"/>
          <rect x="80" y="68" width="8" height="8" rx="1" fill="white"/>
          <rect x="92" y="68" width="8" height="8" rx="1" fill="white"/>
          <rect x="104" y="68" width="8" height="8" rx="1" fill="white"/>
          <rect x="68" y="80" width="8" height="8" rx="1" fill="white"/>
          <rect x="80" y="80" width="8" height="8" rx="1" fill="white"/>
          <rect x="92" y="80" width="8" height="8" rx="1" fill="white"/>
          <rect x="68" y="92" width="8" height="8" rx="1" fill="white"/>
          <rect x="80" y="92" width="8" height="8" rx="1" fill="white"/>
          <rect x="92" y="92" width="8" height="8" rx="1" fill="white"/>
          <rect x="104" y="92" width="8" height="8" rx="1" fill="white"/>
          <rect x="68" y="104" width="8" height="8" rx="1" fill="white"/>
          <rect x="80" y="104" width="8" height="8" rx="1" fill="white"/>
          <rect x="104" y="104" width="8" height="8" rx="1" fill="white"/>
        </svg>
      </div>
    </div>
    
    <div class="qr-url">${tableUrl}</div>
    
    <div class="mode-badge">📱 ${modeLabel}</div>
    <div class="mode-sub">${modeSubLabel}</div>
    
    <div class="divider"></div>
    
    <div class="zero-commission">
      0% Commission · Paiement sécurisé
      <br/><span>Commandez directement, sans intermédiaire</span>
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(() => window.close(), 500);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  }

  const formatCurrency = (n: number) =>
    n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-mv-green/25 bg-gradient-to-br from-mv-green/8 via-mv-cream/30 to-white p-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-mv-green/4 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-mv-green text-white text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                0% Commission
              </span>
              <span className="bg-mv-amber/15 text-mv-amber-dark text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Vs 27% Uber Eats
              </span>
            </div>
            <h3 className="font-display text-[19px] font-semibold text-mv-ink leading-tight">
              Canal de Commande Directe & Click & Collect
            </h3>
            <p className="text-[12.5px] text-mv-ink-soft mt-1 max-w-xl">
              Remplacez Uber Eats et DoorDash par votre propre canal de commande. Intégrez le widget sur votre site, imprimez vos QR codes et encaissez 100% de chaque commande.
            </p>
          </div>
          <a href={publicMenuUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <Button variant="secondary" size="sm" className="whitespace-nowrap">
              <ExternalLink size={13} /> Prévisualiser le portail
            </Button>
          </a>
        </div>
      </div>

      {/* Savings Calculator */}
      <Card className="p-5 border-mv-green/20 bg-gradient-to-r from-mv-green/5 to-transparent">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-mv-green/15 flex items-center justify-center">
            <DollarSign size={15} className="text-mv-green-dark" />
          </div>
          <h4 className="font-semibold text-[14px] text-mv-ink">Simulateur d&apos;Économies</h4>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="text-[12px] font-semibold text-mv-ink-soft mb-1.5 block">
              Ventes mensuelles estimées
            </label>
            <Input
              type="number"
              min="0"
              value={monthlySales}
              onChange={(e) => setMonthlySales(e.target.value)}
              placeholder="Ex : 8000"
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:w-36 rounded-xl bg-mv-red/8 border border-mv-red/15 p-3 text-center">
              <p className="text-[10.5px] text-mv-red font-semibold uppercase tracking-wider">Uber Eats (27%)</p>
              <p className="font-display text-[18px] font-bold text-mv-red mt-0.5">{formatCurrency(uberEatsFees)}<span className="text-[11px] font-normal">/mois</span></p>
            </div>
            <div className="flex items-center text-mv-ink-faint shrink-0">
              <ArrowRight size={16} />
            </div>
            <div className="flex-1 sm:w-36 rounded-xl bg-mv-green/10 border border-mv-green/20 p-3 text-center">
              <p className="text-[10.5px] text-mv-green-dark font-semibold uppercase tracking-wider">Flow Minerva (0%)</p>
              <p className="font-display text-[18px] font-bold text-mv-green-dark mt-0.5">{formatCurrency(0)}<span className="text-[11px] font-normal">/mois</span></p>
            </div>
          </div>
        </div>
        {annualSavings > 0 && (
          <div className="mt-3 rounded-xl bg-mv-green/10 border border-mv-green/20 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-mv-green-dark fill-mv-green-dark" />
              <span className="text-[13px] font-semibold text-mv-ink">Économies annuelles estimées</span>
            </div>
            <span className="font-display text-[20px] font-bold text-mv-green-dark">{formatCurrency(annualSavings)}</span>
          </div>
        )}
      </Card>

      {/* Mode Selector */}
      <div>
        <p className="text-[12px] font-semibold text-mv-ink-soft mb-2 uppercase tracking-wider">Mode de commande à configurer</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setOrderMode("clickcollect")}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
              orderMode === "clickcollect"
                ? "border-mv-green bg-mv-green/8 ring-1 ring-mv-green/30"
                : "border-mv-border bg-mv-surface hover:border-mv-green/30 hover:bg-mv-cream/30"
            )}
          >
            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", orderMode === "clickcollect" ? "bg-mv-green text-white" : "bg-mv-cream text-mv-ink-soft")}>
              <Truck size={17} />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-mv-ink">Click & Collect / À emporter</p>
              <p className="text-[11.5px] text-mv-ink-soft">Widget site web & bouton de partage</p>
            </div>
          </button>
          <button
            onClick={() => setOrderMode("table")}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
              orderMode === "table"
                ? "border-mv-green bg-mv-green/8 ring-1 ring-mv-green/30"
                : "border-mv-border bg-mv-surface hover:border-mv-green/30 hover:bg-mv-cream/30"
            )}
          >
            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", orderMode === "table" ? "bg-mv-green text-white" : "bg-mv-cream text-mv-ink-soft")}>
              <Store size={17} />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-mv-ink">Sur Place / QR Code de Table</p>
              <p className="text-[11.5px] text-mv-ink-soft">Chevalet de table à imprimer</p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Widget Code (for Click & Collect) or QR Table (for table) */}
        {orderMode === "clickcollect" ? (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-mv-ink">
              <div className="h-7 w-7 rounded-lg bg-mv-ink/8 flex items-center justify-center">
                <Code size={15} className="text-mv-green-dark" />
              </div>
              <h4 className="font-semibold text-[14px]">Widget Web Embarquable</h4>
            </div>
            <p className="text-[12px] text-mv-ink-soft">
              Collez ce code dans votre site Wix, WordPress, Squarespace ou Shopify pour intégrer la commande directe.
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-semibold text-mv-ink-soft">Option A : Widget iFrame complet</span>
                  <button
                    onClick={() => handleCopy(iframeSnippet, "iframe")}
                    className="flex items-center gap-1 text-[11px] font-semibold text-mv-green-dark hover:underline"
                  >
                    {copiedIframe ? <Check size={12} /> : <Copy size={12} />}
                    {copiedIframe ? "Copié !" : "Copier"}
                  </button>
                </div>
                <pre className="p-3 bg-mv-ink text-mv-cream-soft rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {iframeSnippet}
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11.5px] font-semibold text-mv-ink-soft">Option B : Bouton « Commander »</span>
                  <button
                    onClick={() => handleCopy(buttonSnippet, "button")}
                    className="flex items-center gap-1 text-[11px] font-semibold text-mv-green-dark hover:underline"
                  >
                    {copiedButton ? <Check size={12} /> : <Copy size={12} />}
                    {copiedButton ? "Copié !" : "Copier HTML"}
                  </button>
                </div>
                <pre className="p-3 bg-mv-ink text-mv-cream-soft rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {buttonSnippet}
                </pre>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-mv-ink">
              <div className="h-7 w-7 rounded-lg bg-mv-ink/8 flex items-center justify-center">
                <QrCode size={15} className="text-mv-green-dark" />
              </div>
              <h4 className="font-semibold text-[14px]">Générateur de QR Code de Table</h4>
            </div>
            <p className="text-[12px] text-mv-ink-soft">
              Imprimez des chevalets de table pour que vos clients commandent directement depuis leur smartphone, sans commission.
            </p>

            <Field label="Numéro de Table">
              <Input
                type="number"
                min="1"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Ex : 1, 2, 3..."
              />
            </Field>

            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={handlePrintQr} className="w-full">
                <Printer size={14} /> Imprimer le chevalet de table #{tableNumber || "1"}
              </Button>
              <button
                onClick={() => handleCopy(tableQrUrl, "link")}
                className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-mv-ink-soft hover:text-mv-ink py-1 transition-colors"
              >
                {copiedLink ? <Check size={12} className="text-mv-green-dark" /> : <Copy size={12} />}
                Copier le lien direct de la table #{tableNumber || "1"}
              </button>
            </div>
          </Card>
        )}

        {/* Right: Live Preview */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-mv-ink">
            <div className="h-7 w-7 rounded-lg bg-mv-ink/8 flex items-center justify-center">
              <Globe size={15} className="text-mv-green-dark" />
            </div>
            <h4 className="font-semibold text-[14px]">Aperçu du Chevalet / Badge</h4>
          </div>

          {/* Badge preview */}
          <div className="flex items-center justify-center py-4">
            <div className="relative w-44 bg-white rounded-2xl border border-mv-border shadow-mv-md overflow-hidden text-center">
              {/* Top green stripe */}
              <div className="h-1.5 bg-gradient-to-r from-mv-green to-mv-green-dark w-full" />
              <div className="p-4 space-y-2.5">
                <p className="font-display text-[13px] font-bold text-mv-ink leading-tight">{restaurantName || "Votre Restaurant"}</p>
                <p className="text-[9px] font-semibold text-mv-green-dark uppercase tracking-wider">Flow · Minerva</p>
                {/* QR placeholder */}
                <div className="mx-auto w-24 h-24 rounded-xl bg-mv-cream border border-mv-border flex items-center justify-center">
                  <QrCode size={52} className="text-mv-ink opacity-80" />
                </div>
                <div className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-bold text-white",
                  orderMode === "table" ? "bg-mv-green" : "bg-mv-green-dark"
                )}>
                  {orderMode === "table" ? `📍 TABLE N° ${tableNumber || "1"}` : "🛍 CLICK & COLLECT"}
                </div>
                <p className="text-[9px] text-mv-ink-faint leading-tight">
                  {orderMode === "table" ? "Scannez pour commander depuis votre table" : "Scannez pour commander à emporter"}
                </p>
                <div className="border-t border-mv-border pt-2">
                  <p className="text-[8.5px] text-mv-green-dark font-bold">0% Commission · Paiement sécurisé</p>
                </div>
              </div>
            </div>
          </div>

          {/* Share link */}
          <div className="rounded-xl border border-mv-border bg-mv-cream/30 p-3">
            <p className="text-[10.5px] font-semibold text-mv-ink-soft mb-1.5">Lien du portail public</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-[11px] text-mv-ink font-mono truncate">{publicMenuUrl}</p>
              <button
                onClick={() => handleCopy(publicMenuUrl, "link")}
                className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-mv-green-dark hover:underline"
              >
                {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                {copiedLink ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
