"use client";

import { useState } from "react";
import { Card } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/minerva/FormField";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Download,
  Share2,
  Camera,
  Copy,
  Check,
  Palette,
  Type,
  Tag,
  MessageSquare,
  Zap,
  Sliders,
  Image as ImageIcon,
  Smartphone,
  Send,
  Calendar,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type VisualFormat = "story" | "post" | "carousel";

type ColorTheme = {
  id: string;
  name: string;
  bg: string;
  cardBg: string;
  text: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
};

const COLOR_THEMES: ColorTheme[] = [
  {
    id: "emerald",
    name: "Émeraude Minerva",
    bg: "#167f5b",
    cardBg: "#116347",
    text: "#ffffff",
    accent: "#fcd34d",
    badgeBg: "#fcd34d",
    badgeText: "#167f5b",
  },
  {
    id: "midnight",
    name: "Nuit Élégante",
    bg: "#0f172a",
    cardBg: "#1e293b",
    text: "#f8fafc",
    accent: "#38bdf8",
    badgeBg: "#38bdf8",
    badgeText: "#0f172a",
  },
  {
    id: "crimson",
    name: "Velours Rouge",
    bg: "#881337",
    cardBg: "#9f1239",
    text: "#ffffff",
    accent: "#fde047",
    badgeBg: "#fde047",
    badgeText: "#881337",
  },
  {
    id: "warm",
    name: "Bistro Chaleureux",
    bg: "#fef3c7",
    cardBg: "#ffffff",
    text: "#78350f",
    accent: "#d97706",
    badgeBg: "#d97706",
    badgeText: "#ffffff",
  },
];

const STICKER_BADGES = [
  "🛒 0% Frais sur Commande Directe",
  "⭐ Spécialité du Chef",
  "🔥 Nouveau au Menu",
  "🎁 10% de réduction en ligne",
  "🍷 Incontournable du Bistro",
];

const MENU_PRESETS = [
  { name: "Burger Signature Double Fromage", price: "18.50 $", desc: "Pain brioché, bœuf 100% local, cheddar affiné 12 mois & sauce secret chef." },
  { name: "Cocktail Spritz Artisan de la Maison", price: "14.00 $", desc: "Aperol, prosecco bio, eau gazeuse & zeste d'orange bio fraîchement coupé." },
  { name: "Formule Brunch Gourmand du Dimanche", price: "28.00 $", desc: "Œufs pochés, bacon croustillant, pancakes au sirop d'érable & café à volonté." },
];

export function MarketingStudioView() {
  const [selectedFormat, setSelectedFormat] = useState<VisualFormat>("story");
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(COLOR_THEMES[0]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  // Customization state
  const [headline, setHeadline] = useState("Commandez en Direct sans Frais !");
  const [itemName, setItemName] = useState(MENU_PRESETS[0].name);
  const [itemPrice, setItemPrice] = useState(MENU_PRESETS[0].price);
  const [itemDesc, setItemDesc] = useState(MENU_PRESETS[0].desc);
  const [selectedSticker, setSelectedSticker] = useState(STICKER_BADGES[0]);
  const [ctaText, setCtaText] = useState("Lien en Bio · Commande Directe 0%");
  const [fontStyle, setFontStyle] = useState<"display" | "sans" | "serif">("display");

  // Re-engagement scenarios state
  const [autoSms30Days, setAutoSms30Days] = useState(true);
  const [autoBirthday, setAutoBirthday] = useState(true);

  const [copiedCaption, setCopiedCaption] = useState(false);

  const generatedCaption = `✨ ${itemName} à déguster chez nous ou en livraison directe !

${itemDesc}

👉 Évitez les frais des plateformes tiers : commandez directement sur notre portail web (0% commission) !
🔗 ${ctaText}

#RestoLocal #Foodie #CommandeDirecte #Gastronomie #Bistro`;

  function applyPreset(index: number) {
    setSelectedPresetIndex(index);
    const p = MENU_PRESETS[index];
    setItemName(p.name);
    setItemPrice(p.price);
    setItemDesc(p.desc);
  }

  async function handleCopyCaption() {
    await navigator.clipboard.writeText(generatedCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
    toast.success("Légende Instagram copiée !");
  }

  function handleDownloadVisual() {
    toast.success("Kit Visuel HD prêt & téléchargé !");
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card className="p-5 border-mv-green/30 bg-gradient-to-r from-mv-green/10 via-white to-mv-cream/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-mv-green text-white text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Studio Marketing Sans IA Forcee
              </span>
              <h2 className="font-display text-[20px] font-bold text-mv-ink">
                Éditeur de Visuels Social Media Ultra-Personnalisable & Relances Clients
              </h2>
            </div>
            <p className="text-[13px] text-mv-ink-soft max-w-2xl">
              Créez en 1-Click des kits visuels professionnels pour Instagram (Stories, Reels, Carrousels) basés sur votre menu, et automatisez les relances SMS/Email de vos clients.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Customization Studio Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-mv-border-soft pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-mv-green-dark" />
                <h3 className="font-semibold text-[15.5px] text-mv-ink">1. Sélection du Plat & Textes</h3>
              </div>

              <div className="flex items-center gap-1">
                {MENU_PRESETS.map((p, idx) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(idx)}
                    className={cn(
                      "px-2.5 py-1 text-[11.5px] font-medium rounded-lg transition-all",
                      selectedPresetIndex === idx
                        ? "bg-mv-green text-white font-semibold"
                        : "bg-mv-cream text-mv-ink-soft hover:bg-mv-cream-soft"
                    )}
                  >
                    Plat #{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Field label="Titre d'Accroche Visuelle">
                <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Ex: Offre Spéciale du Week-end !" />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Field label="Nom du Plat / Produit">
                    <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
                  </Field>
                </div>
                <div>
                  <Field label="Prix / Badge">
                    <Input value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
                  </Field>
                </div>
              </div>

              <Field label="Description courte">
                <Textarea value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} rows={2} />
              </Field>

              <Field label="Call-To-Action (Bas du visuel)">
                <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
              </Field>
            </div>
          </Card>

          {/* Deep Customization Options */}
          <Card className="p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-mv-border-soft pb-3">
              <Palette size={18} className="text-mv-green-dark" />
              <h3 className="font-semibold text-[15.5px] text-mv-ink">2. Thème Visuel & Autocollants</h3>
            </div>

            {/* Format Selection */}
            <div>
              <span className="text-[12px] font-semibold text-mv-ink-soft block mb-2">Format Social Media :</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedFormat("story")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-[12px] font-semibold transition-all",
                    selectedFormat === "story"
                      ? "border-mv-green bg-mv-green/10 text-mv-green-dark ring-2 ring-mv-green/30"
                      : "border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
                  )}
                >
                  <Smartphone size={18} className="mb-1" />
                  Instagram Story (9:16)
                </button>
                <button
                  onClick={() => setSelectedFormat("post")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-[12px] font-semibold transition-all",
                    selectedFormat === "post"
                      ? "border-mv-green bg-mv-green/10 text-mv-green-dark ring-2 ring-mv-green/30"
                      : "border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
                  )}
                >
                  <Camera size={18} className="mb-1" />
                  Post Carré (1:1)
                </button>
                <button
                  onClick={() => setSelectedFormat("carousel")}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-[12px] font-semibold transition-all",
                    selectedFormat === "carousel"
                      ? "border-mv-green bg-mv-green/10 text-mv-green-dark ring-2 ring-mv-green/30"
                      : "border-mv-border bg-mv-surface text-mv-ink-soft hover:bg-mv-cream-soft"
                  )}
                >
                  <ImageIcon size={18} className="mb-1" />
                  Carrousel (4:5)
                </button>
              </div>
            </div>

            {/* Theme Selection */}
            <div>
              <span className="text-[12px] font-semibold text-mv-ink-soft block mb-2">Palette de Couleurs :</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border text-[11.5px] font-medium transition-all text-left",
                      selectedTheme.id === theme.id
                        ? "border-mv-green ring-2 ring-mv-green/30"
                        : "border-mv-border hover:border-mv-border-soft"
                    )}
                  >
                    <span className="h-5 w-5 rounded-full border border-black/10 shrink-0" style={{ background: theme.bg }} />
                    <span className="truncate text-mv-ink">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sticker Badges */}
            <div>
              <span className="text-[12px] font-semibold text-mv-ink-soft block mb-2">Badge / Autocollant Vedette :</span>
              <div className="flex flex-wrap gap-1.5">
                {STICKER_BADGES.map((badge) => (
                  <button
                    key={badge}
                    onClick={() => setSelectedSticker(badge)}
                    className={cn(
                      "px-2.5 py-1 text-[11.5px] font-semibold rounded-lg border transition-all",
                      selectedSticker === badge
                        ? "bg-mv-green text-white border-mv-green shadow-sm"
                        : "bg-mv-cream/50 text-mv-ink-soft border-mv-border-soft hover:bg-mv-cream"
                    )}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Visual Canvas & Caption (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Render Canvas Card */}
          <Card className="p-5 flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center justify-between w-full border-b border-mv-border-soft pb-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-mv-green-dark flex items-center gap-1.5">
                <Eye size={14} /> Aperçu en Direct
              </span>
              <span className="text-[11px] font-semibold text-mv-ink-faint uppercase">
                {selectedFormat}
              </span>
            </div>

            {/* Render Canvas Box */}
            <div
              className={cn(
                "w-full transition-all duration-300 rounded-2xl p-6 shadow-mv-md flex flex-col justify-between relative overflow-hidden text-center",
                selectedFormat === "story" ? "aspect-[9/16] max-w-[280px]" : selectedFormat === "carousel" ? "aspect-[4/5] max-w-[300px]" : "aspect-square max-w-[300px]"
              )}
              style={{ background: selectedTheme.bg, color: selectedTheme.text }}
            >
              {/* Header Badge */}
              <div className="flex justify-center">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm"
                  style={{ background: selectedTheme.badgeBg, color: selectedTheme.badgeText }}
                >
                  {selectedSticker}
                </span>
              </div>

              {/* Central Content */}
              <div className="my-auto space-y-3 py-4">
                <p className="text-[12px] uppercase tracking-widest opacity-80 font-bold">{headline}</p>
                <h3 className="font-display text-[22px] font-bold leading-tight drop-shadow-sm">
                  {itemName}
                </h3>
                <div
                  className="inline-block px-4 py-1.5 rounded-full font-bold text-[16px] shadow-md my-2"
                  style={{ background: selectedTheme.cardBg, color: selectedTheme.accent }}
                >
                  {itemPrice}
                </div>
                <p className="text-[11.5px] opacity-90 line-clamp-3 max-w-[220px] mx-auto leading-snug">
                  {itemDesc}
                </p>
              </div>

              {/* Bottom CTA */}
              <div className="pt-2 border-t border-white/20">
                <p className="text-[10.5px] font-semibold tracking-wide uppercase opacity-95">
                  {ctaText}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full flex items-center gap-2 pt-2">
              <Button onClick={handleDownloadVisual} className="flex-1">
                <Download size={15} /> Télécharger le Kit Visuel HD
              </Button>
            </div>
          </Card>

          {/* Caption & Re-engagement Card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-[14px] text-mv-ink">Légende Social Media Pré-Rédigée</h4>
              <button
                onClick={handleCopyCaption}
                className="flex items-center gap-1 text-[12px] font-medium text-mv-green-dark hover:underline"
              >
                {copiedCaption ? <Check size={13} /> : <Copy size={13} />}
                {copiedCaption ? "Copié !" : "Copier la légende"}
              </button>
            </div>

            <pre className="p-3 bg-mv-cream/40 border border-mv-border-soft rounded-xl text-[12px] text-mv-ink font-sans whitespace-pre-wrap">
              {generatedCaption}
            </pre>
          </Card>

          {/* Automated Customer Re-engagement Scenarios Card */}
          <Card className="p-5 space-y-4 border-mv-border">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-mv-green-dark" />
              <h4 className="font-semibold text-[14.5px] text-mv-ink">Automatisations de Relance Clients (SMS & Email)</h4>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3 border border-mv-border-soft rounded-xl bg-mv-surface">
                <div>
                  <p className="text-[13px] font-semibold text-mv-ink">Relance Clients Inactifs (30+ jours)</p>
                  <p className="text-[11.5px] text-mv-ink-faint">SMS avec code promo 10% sur la commande directe</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSms30Days}
                  onChange={(e) => setAutoSms30Days(e.target.checked)}
                  className="h-4 w-4 accent-mv-green rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-mv-border-soft rounded-xl bg-mv-surface">
                <div>
                  <p className="text-[13px] font-semibold text-mv-ink">Rappel Anniversaire Client</p>
                  <p className="text-[11.5px] text-mv-ink-faint">Offre dessert offert lors de leur prochaine visite</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoBirthday}
                  onChange={(e) => setAutoBirthday(e.target.checked)}
                  className="h-4 w-4 accent-mv-green rounded cursor-pointer"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
