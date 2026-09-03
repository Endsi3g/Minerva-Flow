"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/minerva/FormField";
import { Download, QrCode as QrIcon } from "lucide-react";
import { toast } from "sonner";
import { embedPngDpi } from "@/lib/print/png-dpi";

const DPI = 300;

type KitFormat = {
  id: "table_4x6" | "comptoir_5x7" | "caisse_2x2";
  label: string;
  widthIn: number;
  heightIn: number;
  headline: string;
  subline: string;
};

const FORMATS: KitFormat[] = [
  {
    id: "table_4x6",
    label: "Affiche de table — 4 × 6 po",
    widthIn: 4,
    heightIn: 6,
    headline: "Vos récompenses commencent ici",
    subline: "Scannez pour rejoindre le programme fidélité — gratuit, 10 secondes.",
  },
  {
    id: "comptoir_5x7",
    label: "Présentoir comptoir — 5 × 7 po",
    widthIn: 5,
    heightIn: 7,
    headline: "Client fidèle? Vos avantages vous attendent.",
    subline: "Cumulez des points à chaque visite et débloquez des récompenses exclusives.",
  },
  {
    id: "caisse_2x2",
    label: "Autocollant caisse — 2 × 2 po",
    widthIn: 2,
    heightIn: 2,
    headline: "Scannez pour vos récompenses",
    subline: "",
  },
];

const CREAM = "#FAFAF5";
const INK = "#1A1E16";
const INK_SOFT = "#5B6158";
const GREEN = "#167F5B";
const GREEN_DARK = "#0E5A40";
const BORDER = "#E3DFD1";

async function renderFormat(
  format: KitFormat,
  qrDataUrl: string,
  restaurantName: string
): Promise<string> {
  const width = Math.round(format.widthIn * DPI);
  const height = Math.round(format.heightIn * DPI);
  const isSticker = format.id === "caisse_2x2";

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponible");

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, width, height);

  const borderMargin = Math.round(width * 0.035);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = Math.max(2, Math.round(width * 0.006));
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(
      borderMargin,
      borderMargin,
      width - borderMargin * 2,
      height - borderMargin * 2,
      Math.round(width * 0.03)
    );
    ctx.stroke();
  } else {
    ctx.strokeRect(borderMargin, borderMargin, width - borderMargin * 2, height - borderMargin * 2);
  }

  ctx.textAlign = "center";

  // The 2×2 sticker has too little room for the same proportional formula as
  // the two larger formats (three text blocks + a QR code in 600×600px) — it
  // needs its own fixed budget, tuned and verified, rather than scaled-down
  // fractions that silently overflow into the border.
  let qrX: number;
  let qrY: number;
  let qrSize: number;
  let qrPad: number;
  let footerBaselineY: number;
  let footerSize: number;

  if (isSticker) {
    ctx.fillStyle = GREEN;
    ctx.font = `bold ${Math.round(width * 0.037)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText("MINERVA FLOW", width / 2, Math.round(height * 0.08));

    ctx.fillStyle = INK;
    const headlineSize = Math.round(width * 0.06);
    ctx.font = `700 ${headlineSize}px 'Playfair Display', serif`;
    const headlineLines = wrapText(ctx, format.headline, Math.round(width * 0.8));
    const headlineLineHeight = headlineSize * 1.18;
    let headlineY = Math.round(height * 0.18);
    for (const line of headlineLines) {
      ctx.fillText(line, width / 2, headlineY);
      headlineY += headlineLineHeight;
    }

    qrSize = Math.round(width * 0.467);
    qrPad = Math.round(width * 0.027);
    qrX = (width - qrSize) / 2;
    qrY = Math.round(height * 0.3);
    footerSize = Math.round(width * 0.03);
    footerBaselineY = Math.round(height * 0.9);
  } else {
    const contentPad = Math.round(width * 0.14);
    const contentWidth = width - contentPad * 2;
    let cursorY = Math.round(height * 0.12);

    ctx.fillStyle = GREEN;
    ctx.font = `bold ${Math.round(width * 0.042)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText("MINERVA FLOW", width / 2, cursorY);
    cursorY += Math.round(width * 0.09);

    ctx.fillStyle = INK;
    const headlineSize = Math.round(width * 0.082);
    ctx.font = `700 ${headlineSize}px 'Playfair Display', serif`;
    const headlineLines = wrapText(ctx, format.headline, contentWidth);
    const headlineLineHeight = headlineSize * 1.18;
    for (const line of headlineLines) {
      cursorY += headlineLineHeight * 0.62;
      ctx.fillText(line, width / 2, cursorY);
      cursorY += headlineLineHeight * 0.38;
    }
    cursorY += headlineSize * 0.35;

    if (format.subline) {
      ctx.fillStyle = INK_SOFT;
      const sublineSize = Math.round(width * 0.038);
      ctx.font = `500 ${sublineSize}px 'Plus Jakarta Sans', sans-serif`;
      const sublineLines = wrapText(ctx, format.subline, contentWidth);
      const sublineLineHeight = sublineSize * 1.35;
      for (const line of sublineLines) {
        cursorY += sublineLineHeight * 0.65;
        ctx.fillText(line, width / 2, cursorY);
        cursorY += sublineLineHeight * 0.35;
      }
    }

    // QR block — pinned toward the bottom, sized to what remains
    const footerReserve = Math.round(height * 0.12);
    const qrTop = cursorY + Math.round(height * 0.04);
    const availableForQr = height - footerReserve - qrTop;
    qrSize = Math.min(availableForQr - Math.round(width * 0.08), contentWidth);
    qrX = (width - qrSize) / 2;
    qrY = qrTop + (availableForQr - qrSize) / 2;
    qrPad = Math.round(qrSize * 0.06);
    footerSize = Math.round(width * 0.032);
    footerBaselineY = height - footerReserve / 2 + footerSize / 3;
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = Math.max(2, Math.round(width * 0.004));
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, Math.round(qrSize * 0.06));
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2);
  }

  const qrImg = new Image();
  qrImg.src = qrDataUrl;
  await new Promise((resolve, reject) => {
    qrImg.onload = resolve;
    qrImg.onerror = reject;
  });
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Footer
  ctx.fillStyle = GREEN_DARK;
  ctx.font = `700 ${footerSize}px 'Plus Jakarta Sans', sans-serif`;
  const footerText = restaurantName ? `✦ ${restaurantName.toUpperCase()} ✦` : "✦ PROGRAMME DE FIDÉLITÉ ✦";
  ctx.fillText(footerText, width / 2, footerBaselineY);

  return embedPngDpi(canvas.toDataURL("image/png"), DPI);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function QrFieldKitGenerator({
  defaultRestaurantName = "",
  defaultPortalUrl = "",
}: {
  defaultRestaurantName?: string;
  defaultPortalUrl?: string;
}) {
  const [portalUrl, setPortalUrl] = useState(defaultPortalUrl);
  const [restaurantName, setRestaurantName] = useState(defaultRestaurantName);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(portalUrl || "https://minervaflow.app", {
      width: 600,
      margin: 1,
      color: { dark: INK, light: "#FFFFFF" },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error("QR generation error", err));
    return () => {
      isMounted = false;
    };
  }, [portalUrl]);

  useEffect(() => {
    if (!qrDataUrl) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        FORMATS.map(async (format) => [format.id, await renderFormat(format, qrDataUrl, restaurantName)] as const)
      );
      if (!cancelled) setPreviews(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [qrDataUrl, restaurantName]);

  async function handleDownload(format: KitFormat) {
    if (!qrDataUrl) return;
    setIsExporting(format.id);
    try {
      const dataUrl = await renderFormat(format, qrDataUrl, restaurantName);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Minerva-Flow-${format.id}.png`;
      a.click();
      toast.success(`${format.label} téléchargée en haute définition.`);
    } catch (err) {
      console.error(err);
      toast.error("Échec du téléchargement.");
    } finally {
      setIsExporting(null);
    }
  }

  async function handleDownloadAll() {
    for (const format of FORMATS) {
      await handleDownload(format);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Lien du portail fidélité (QR)">
          <Input
            value={portalUrl}
            onChange={(e) => setPortalUrl(e.target.value)}
            placeholder="https://minervaflow.app/rejoindre/..."
          />
        </Field>
        <Field label="Nom du restaurant (facultatif)">
          <Input
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Laissez vide pour « Programme de fidélité »"
          />
        </Field>
      </div>

      <Button onClick={handleDownloadAll} disabled={!qrDataUrl || isExporting !== null} className="gap-2">
        <Download size={15} />
        {isExporting ? "Génération 300 DPI…" : "Télécharger les 3 supports (PNG HD)"}
      </Button>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {FORMATS.map((format) => (
          <div
            key={format.id}
            className="flex flex-col items-center gap-3 rounded-2xl border border-mv-border bg-mv-surface p-4"
          >
            <p className="text-[12px] font-semibold text-mv-ink">{format.label}</p>
            <div
              className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-mv-border-soft bg-mv-cream-soft"
              style={{ aspectRatio: `${format.widthIn} / ${format.heightIn}` }}
            >
              {previews[format.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[format.id]} alt={format.label} className="h-full w-full object-contain" />
              ) : (
                <QrIcon size={22} className="animate-spin text-mv-ink-faint" />
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(format)}
              disabled={!qrDataUrl || isExporting !== null}
              className="w-full gap-1.5"
            >
              <Download size={13} />
              Télécharger
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
