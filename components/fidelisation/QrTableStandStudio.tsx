"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/minerva/FormField";
import { Download, QrCode as QrIcon, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export type QrStudioFormat = "chevalet_a6" | "sticker_carre" | "carton_addition";

const themeStyles: Record<
  string,
  {
    bg: string;
    bgHex: string;
    text: string;
    accent: string;
    accentHex: string;
    qrDark: string;
    qrLight: string;
    border: string;
    borderHex: string;
  }
> = {
  emerald: {
    bg: "bg-[#062419]",
    bgHex: "#062419",
    text: "text-[#F8F5EE]",
    accent: "text-[#B4F064]",
    accentHex: "#B4F064",
    qrDark: "#062419",
    qrLight: "#FFFFFF",
    border: "border-[#1D4A38]",
    borderHex: "rgba(255,255,255,0.12)",
  },
  ink: {
    bg: "bg-[#111827]",
    bgHex: "#111827",
    text: "text-[#F9FAFB]",
    accent: "text-[#E5E7EB]",
    accentHex: "#E5E7EB",
    qrDark: "#111827",
    qrLight: "#FFFFFF",
    border: "border-gray-800",
    borderHex: "rgba(255,255,255,0.12)",
  },
  cream: {
    bg: "bg-[#FDFBF7]",
    bgHex: "#FDFBF7",
    text: "text-[#1C2024]",
    accent: "text-[#062419]",
    accentHex: "#062419",
    qrDark: "#1C2024",
    qrLight: "#FDFBF7",
    border: "border-[#E5DFD5]",
    borderHex: "#E5DFD5",
  },
  gold: {
    bg: "bg-[#1E1B18]",
    bgHex: "#1E1B18",
    text: "text-[#F3EED9]",
    accent: "text-[#D4AF37]",
    accentHex: "#D4AF37",
    qrDark: "#1E1B18",
    qrLight: "#FFFFFF",
    border: "border-[#3D372E]",
    borderHex: "rgba(255,255,255,0.12)",
  },
  terracotta: {
    bg: "bg-[#3D2116]",
    bgHex: "#3D2116",
    text: "text-[#FBF2E9]",
    accent: "text-[#E8A87C]",
    accentHex: "#E8A87C",
    qrDark: "#3D2116",
    qrLight: "#FFFFFF",
    border: "border-[#5A3A29]",
    borderHex: "rgba(255,255,255,0.12)",
  },
};

// CRC32 for the pHYs chunk we inject below — the canvas pixel dimensions were
// already sized correctly for 300 DPI at each paper format, but a PNG with no
// pHYs chunk carries no DPI metadata at all: print software that doesn't
// assume the exact paper size has no way to know the file is "300 DPI".
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32BE(value: number, out: Uint8Array, offset: number) {
  out[offset] = (value >>> 24) & 0xff;
  out[offset + 1] = (value >>> 16) & 0xff;
  out[offset + 2] = (value >>> 8) & 0xff;
  out[offset + 3] = value & 0xff;
}

/** Inserts a pHYs chunk (pixels-per-meter, both axes) right after IHDR. */
function embedPngDpi(dataUrl: string, dpi: number): string {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // PNG signature (8 bytes) + IHDR chunk: 4-byte length + 4-byte type "IHDR" +
  // 13 bytes of data + 4-byte CRC = 25 bytes, so IHDR always ends at offset 33.
  const ihdrEnd = 33;

  const pxPerMeter = Math.round(dpi / 0.0254);
  const chunkData = new Uint8Array(9);
  writeUint32BE(pxPerMeter, chunkData, 0);
  writeUint32BE(pxPerMeter, chunkData, 4);
  chunkData[8] = 1; // unit specifier: 1 = meter

  const type = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // "pHYs"
  const crcInput = new Uint8Array(type.length + chunkData.length);
  crcInput.set(type, 0);
  crcInput.set(chunkData, type.length);
  const crc = crc32(crcInput);

  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  writeUint32BE(9, chunk, 0);
  chunk.set(type, 4);
  chunk.set(chunkData, 8);
  writeUint32BE(crc, chunk, 17);

  const result = new Uint8Array(bytes.length + chunk.length);
  result.set(bytes.subarray(0, ihdrEnd), 0);
  result.set(chunk, ihdrEnd);
  result.set(bytes.subarray(ihdrEnd), ihdrEnd + chunk.length);

  let out = "";
  for (let i = 0; i < result.length; i++) out += String.fromCharCode(result[i]);
  return `data:image/png;base64,${btoa(out)}`;
}

export function QrTableStandStudio({
  restaurantName,
  portalUrl,
}: {
  restaurantName: string;
  portalUrl: string;
}) {
  const [format, setFormat] = useState<QrStudioFormat>("chevalet_a6");
  const [theme, setTheme] = useState<string>("emerald");
  const [headline, setHeadline] = useState("Scannez pour rejoindre notre Club Privé");
  const [subline, setSubline] = useState("Cumulez des points & débloquez vos récompenses exclusives");
  const [footerText, setFooterText] = useState(`✦ ${restaurantName.toUpperCase()} VIP ✦`);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeTheme = themeStyles[theme] || themeStyles.emerald;

  // Generate QR Code data URL asynchronously
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(portalUrl || "https://minerva-flow.com", {
      width: 600,
      margin: 2,
      color: {
        dark: activeTheme.qrDark,
        light: activeTheme.qrLight,
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("QR Code generation error", err);
      });

    return () => {
      isMounted = false;
    };
  }, [portalUrl, activeTheme.qrDark, activeTheme.qrLight]);

  function handleCopy() {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success("Lien copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  }

  // Export high resolution PNG (300 DPI)
  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const isA6 = format === "chevalet_a6";
      const isSticker = format === "sticker_carre";

      const width = isSticker ? 1200 : 1240;
      const height = isSticker ? 1200 : isA6 ? 1748 : 900;

      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = activeTheme.bgHex;
      ctx.fillRect(0, 0, width, height);

      // Border outline
      ctx.strokeStyle = activeTheme.borderHex;
      ctx.lineWidth = 16;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // Header Restaurant Name
      ctx.textAlign = "center";
      ctx.fillStyle = activeTheme.accentHex;
      ctx.font = "bold 38px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(restaurantName.toUpperCase(), width / 2, isSticker ? 160 : 180);

      // Headline
      ctx.fillStyle = theme === "cream" ? "#1C2024" : "#F8F5EE";
      ctx.font = "bold 54px 'Playfair Display', serif";
      ctx.fillText(headline, width / 2, isSticker ? 260 : 290);

      // Subline
      ctx.fillStyle = theme === "cream" ? "#555" : "rgba(248,245,238,0.75)";
      ctx.font = "30px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(subline, width / 2, isSticker ? 330 : 370);

      // QR Code Image
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
      });

      const qrSize = isSticker ? 560 : isA6 ? 640 : 420;
      const qrX = (width - qrSize) / 2;
      const qrY = isSticker ? 430 : isA6 ? 510 : 380;

      // White container for QR
      ctx.fillStyle = "#FFFFFF";
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 28);
      } else {
        ctx.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);
      }
      ctx.fill();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Footer call to action
      ctx.fillStyle = activeTheme.accentHex;
      ctx.font = "bold 32px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(footerText, width / 2, height - (isSticker ? 90 : 140));

      const dataUrl = embedPngDpi(canvas.toDataURL("image/png"), 300);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Affiche-Table-${restaurantName.replace(/\s+/g, "_")}-${format}.png`;
      a.click();
      toast.success("Affiche haute définition téléchargée !");
    } catch (err) {
      console.error(err);
      toast.error("Échec du téléchargement.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Settings Column */}
      <div className="lg:col-span-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Format du support">
            <Select value={format} onChange={(e) => setFormat(e.target.value as QrStudioFormat)}>
              <option value="chevalet_a6">Chevalet de Table (A6)</option>
              <option value="sticker_carre">Sticker Carré (Table / Comptoir)</option>
              <option value="carton_addition">Carton Addition / Pochette</option>
            </Select>
          </Field>
          <Field label="Thème visuel">
            <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="emerald">Vert Émeraude & Lime (Minerva)</option>
              <option value="ink">Noir Nuit & Titane</option>
              <option value="cream">Crème & Minimaliste</option>
              <option value="gold">Or & Noir Sombre</option>
              <option value="terracotta">Terracotta & Sable</option>
            </Select>
          </Field>
        </div>

        <Field label="Titre d'accroche">
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Ex : Scannez pour rejoindre le Club" />
        </Field>

        <Field label="Sous-titre explicatif">
          <Input value={subline} onChange={(e) => setSubline(e.target.value)} placeholder="Ex : 50 points offerts à votre première commande" />
        </Field>

        <Field label="Texte de bas de page">
          <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Ex : ✦ VOTRE RESTAURANT VIP ✦" />
        </Field>

        <div className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 p-3.5 space-y-2 text-[12px] text-mv-ink-soft">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-mv-ink">Lien public scanné :</span>
            <button onClick={handleCopy} className="inline-flex items-center gap-1 text-mv-green-dark hover:underline font-medium">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copié" : "Copier le lien"}
            </button>
          </div>
          <p className="truncate font-mono text-[11px] bg-white p-2 rounded-lg border border-mv-border-soft">{portalUrl}</p>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Button onClick={handleDownload} disabled={isExporting || !qrDataUrl} className="w-full gap-2 py-2.5">
            <Download size={15} />
            {isExporting ? "Génération 300 DPI…" : "Télécharger l'Affiche (PNG HD)"}
          </Button>
        </div>
      </div>

      {/* Live Preview Column */}
      <div className="lg:col-span-6 flex flex-col items-center justify-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint mb-2">Aperçu en direct</p>
        <div
          className={`w-full max-w-[320px] rounded-2xl p-6 border shadow-xl transition-all ${activeTheme.bg} ${activeTheme.text} ${activeTheme.border} ${
            format === "chevalet_a6" ? "aspect-[1/1.4]" : format === "sticker_carre" ? "aspect-square" : "aspect-[1.5/1]"
          } flex flex-col items-center justify-between text-center`}
        >
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${activeTheme.accent}`}>{restaurantName}</p>
            <h4 className="mt-1 font-serif text-[16px] font-bold leading-tight line-clamp-2">{headline}</h4>
            <p className="mt-1 text-[10px] opacity-75 line-clamp-2">{subline}</p>
          </div>

          <div className="my-auto rounded-xl bg-white p-2 shadow-md">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR Code de table" className="h-32 w-32 object-contain" />
            ) : (
              <div className="h-32 w-32 flex items-center justify-center">
                <QrIcon size={24} className="animate-spin text-mv-ink-faint" />
              </div>
            )}
          </div>

          <p className={`text-[9.5px] font-semibold tracking-wider ${activeTheme.accent}`}>{footerText}</p>
        </div>
      </div>
    </div>
  );
}
