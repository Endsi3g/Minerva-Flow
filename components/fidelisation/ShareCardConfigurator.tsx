"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Card, CardHeader } from "@/components/minerva/PageCard";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/minerva/FormField";
import { ResultsShareCard, type CardBackground, type FooterBadge } from "@/components/fidelisation/ResultsShareCard";
import type { ShareableMetric } from "@/lib/data/retention-metrics";
import {
  Download,
  Loader2,
  Star,
  Quote as QuoteIcon,
  Link2,
  X,
  Trophy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CardFormat = "post" | "story" | "carousel";

const FORMAT_OPTIONS: {
  id: CardFormat;
  label: string;
  hint: string;
  aspectClass: string;
  width: number;
  height: number;
}[] = [
  // 4:5 (not a strict square) — more room for 3 stats + footer badges without
  // clipping, and is itself a standard, widely-used Instagram/Facebook feed ratio.
  { id: "post", label: "Publication", hint: "Instagram & Facebook (4:5)", aspectClass: "aspect-[4/5]", width: 320, height: 400 },
  { id: "story", label: "Story / Reel", hint: "Instagram & TikTok (9:16)", aspectClass: "aspect-[9/16]", width: 280, height: 498 },
  { id: "carousel", label: "Carrousel", hint: "Une slide par statistique", aspectClass: "aspect-[4/5]", width: 280, height: 350 },
];

const BACKGROUND_OPTIONS: { id: CardBackground; label: string }[] = [
  { id: "brand", label: "Marque" },
  { id: "white", label: "Blanc" },
  { id: "black", label: "Noir" },
  { id: "transparent", label: "Transparent" },
];

const THUMBNAIL_WIDTH = 92;

export type ShareCardConfiguratorProps = {
  metrics: ShareableMetric[];
  restaurantName: string;
  logoUrl: string | null;
  restaurantUrl: string;
  /** Prefix used in downloaded filenames, e.g. "minerva-flow" or a restaurant slug. */
  filePrefix?: string;
  /**
   * Admin-only: lets the displayed hero/stat values be manually overridden
   * (e.g. a number that hasn't caught up to reality yet). Never exposed to
   * restaurant owners — their card always reflects their real data.
   */
  allowValueOverride?: boolean;
};

// Defined at module scope (not inside the component) so the linter's
// component-purity check doesn't flag this impure call — it only ever runs
// from the click handler below, never during render.
function timestampSuffix(): number {
  return Date.now();
}

function moveItem<T>(arr: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function ReorderButtons({
  index,
  count,
  onMove,
}: {
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col">
      <button
        type="button"
        aria-label="Monter"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className="rounded p-0.5 text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronUp size={13} />
      </button>
      <button
        type="button"
        aria-label="Descendre"
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        className="rounded p-0.5 text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronDown size={13} />
      </button>
    </div>
  );
}

/**
 * The content-picker + format/background switcher + live preview + export
 * button for a results share card. Shared by the owner-facing page
 * (fidelisation/resultats) and the platform-admin page (admin/resultats) —
 * both just supply a different metrics/name/logo source.
 */
export function ShareCardConfigurator({
  metrics,
  restaurantName,
  logoUrl,
  restaurantUrl,
  filePrefix = "minerva-flow",
  allowValueOverride = false,
}: ShareCardConfiguratorProps) {
  const [heroId, setHeroId] = useState<string>(metrics[0]?.id ?? "");
  const [statIds, setStatIds] = useState<string[]>(metrics.slice(1, 4).map((m) => m.id));
  const [background, setBackground] = useState<CardBackground>("brand");
  const [format, setFormat] = useState<CardFormat>("post");
  const [badges, setBadges] = useState<FooterBadge[]>([{ type: "link", url: restaurantUrl }]);
  const [isExporting, setIsExporting] = useState(false);
  const [heroOverride, setHeroOverride] = useState("");
  const [statOverrides, setStatOverrides] = useState<string[]>(["", "", ""]);

  const mainCardRef = useRef<HTMLDivElement>(null);
  const spotlightRefs = useRef<(HTMLDivElement | null)[]>([]);

  const byId = useMemo(() => new Map<string, ShareableMetric>(metrics.map((m) => [m.id, m])), [metrics]);
  const hero = byId.get(heroId) ?? metrics[0];
  const stats = statIds.map((id) => byId.get(id)).filter((m): m is ShareableMetric => Boolean(m));
  const statOptions = metrics.filter((m) => m.id !== heroId);
  const formatDef = FORMAT_OPTIONS.find((f) => f.id === format)!;

  // Override applies only to what's rendered/exported — never to the
  // selection dropdowns, which must keep showing the real values.
  const heroDisplay =
    allowValueOverride && heroOverride.trim() && hero ? { ...hero, formattedValue: heroOverride.trim() } : hero;
  const statsDisplay = stats.map((s, i) =>
    allowValueOverride && statOverrides[i]?.trim() ? { ...s, formattedValue: statOverrides[i].trim() } : s
  );

  function updateStat(index: number, id: string) {
    setStatIds((prev) => {
      const next = [...prev];
      next[index] = id;
      return next;
    });
  }

  function moveStat(index: number, direction: -1 | 1) {
    setStatIds((prev) => moveItem(prev, index, direction));
    setStatOverrides((prev) => moveItem(prev, index, direction));
  }

  function moveBadge(index: number, direction: -1 | 1) {
    setBadges((prev) => moveItem(prev, index, direction));
  }

  function addBadge(type: FooterBadge["type"]) {
    if (badges.some((b) => b.type === type)) return;
    if (type === "rating") setBadges((prev) => [...prev, { type: "rating", value: 4.8 }]);
    if (type === "quote") setBadges((prev) => [...prev, { type: "quote", text: "Un vrai changement pour nous." }]);
    if (type === "link") setBadges((prev) => [...prev, { type: "link", url: restaurantUrl }]);
  }

  function removeBadge(index: number) {
    setBadges((prev) => prev.filter((_, i) => i !== index));
  }

  function updateBadge(index: number, patch: Partial<FooterBadge>) {
    setBadges((prev) => prev.map((b, i) => (i === index ? ({ ...b, ...patch } as FooterBadge) : b)));
  }

  /**
   * `fullSize` forces the capture back to the node's real, unscaled
   * dimensions — needed for the carousel spotlight thumbnails, which are
   * displayed shrunk via CSS `transform: scale()` (see the thumbnail row
   * below) so the full-resolution export doesn't come out tiny.
   */
  async function downloadNode(node: HTMLDivElement, filename: string, fullSize?: { width: number; height: number }) {
    const dataUrl = await toPng(node, {
      pixelRatio: 4,
      cacheBust: true,
      ...(fullSize
        ? { width: fullSize.width, height: fullSize.height, style: { transform: "none" } as Partial<CSSStyleDeclaration> }
        : {}),
    });
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  async function handleDownload() {
    setIsExporting(true);
    try {
      if (format !== "carousel") {
        if (!mainCardRef.current) return;
        await downloadNode(mainCardRef.current, `${filePrefix}-resultats-${format}-${timestampSuffix()}.png`);
        toast.success("Carte téléchargée.");
        return;
      }

      // Carrousel : la slide 1 = carte complète, puis une slide "spotlight"
      // par statistique choisie — même système visuel, pas de gabarit à part.
      if (mainCardRef.current) {
        await downloadNode(mainCardRef.current, `${filePrefix}-carrousel-1-resultat.png`);
      }
      for (let i = 0; i < statsDisplay.length; i++) {
        const node = spotlightRefs.current[i];
        if (!node) continue;
        await downloadNode(node, `${filePrefix}-carrousel-${i + 2}-${statsDisplay[i].id}.png`, {
          width: formatDef.width,
          height: formatDef.height,
        });
        // Léger délai entre chaque téléchargement — évite que le navigateur
        // bloque des téléchargements multiples déclenchés d'un coup.
        await new Promise((r) => setTimeout(r, 350));
      }
      toast.success(`Carrousel téléchargé (${1 + statsDisplay.length} images).`);
    } catch {
      toast.error("Le téléchargement a échoué. Réessayez.");
    } finally {
      setIsExporting(false);
    }
  }

  const thumbnailScale = THUMBNAIL_WIDTH / formatDef.width;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left: configuration */}
      <div className="lg:col-span-7 space-y-5">
        <Card>
          <CardHeader eyebrow="Contenu" title="Métrique héro" description="Le grand chiffre affiché dans la bande verte." />
          <Select aria-label="Métrique héro" value={heroId} onChange={(e) => setHeroId(e.target.value)}>
            {metrics.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.formattedValue}
              </option>
            ))}
          </Select>
          {allowValueOverride && (
            <Input
              value={heroOverride}
              onChange={(e) => setHeroOverride(e.target.value)}
              placeholder={`Valeur affichée (par défaut : ${hero?.formattedValue ?? ""})`}
              className="mt-2 h-8 text-[12.5px]"
            />
          )}
        </Card>

        <Card>
          <CardHeader eyebrow="Contenu" title="3 statistiques" description="Affichées sous la bande verte, dans cet ordre." />
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <ReorderButtons index={i} count={3} onMove={(dir) => moveStat(i, dir)} />
                <div className="flex-1 space-y-1.5">
                  <Select aria-label={`Statistique ${i + 1}`} value={statIds[i] ?? ""} onChange={(e) => updateStat(i, e.target.value)}>
                    <option value="" disabled>
                      Choisir une statistique…
                    </option>
                    {statOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.formattedValue}
                      </option>
                    ))}
                  </Select>
                  {allowValueOverride && (
                    <Input
                      value={statOverrides[i] ?? ""}
                      onChange={(e) =>
                        setStatOverrides((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                      placeholder="Valeur affichée (optionnel)"
                      className="h-8 text-[12.5px]"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            eyebrow="Pied de page"
            title="Badges (cote)"
            description="Combine librement une note, une citation et/ou un lien — dans l'ordre de ton choix."
          />
          <div className="mb-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addBadge("rating")}
              disabled={badges.some((b) => b.type === "rating")}
            >
              <Star size={13} /> Note
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addBadge("quote")}
              disabled={badges.some((b) => b.type === "quote")}
            >
              <QuoteIcon size={13} /> Citation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addBadge("link")}
              disabled={badges.some((b) => b.type === "link")}
            >
              <Link2 size={13} /> Lien
            </Button>
          </div>
          <div className="space-y-2">
            {badges.map((badge, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-lg border border-mv-border-soft p-2">
                <ReorderButtons index={i} count={badges.length} onMove={(dir) => moveBadge(i, dir)} />
                {badge.type === "rating" && (
                  <>
                    <Star size={14} className="shrink-0 text-mv-ink-faint" />
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      value={badge.value}
                      onChange={(e) => updateBadge(i, { value: Number(e.target.value) } as Partial<FooterBadge>)}
                      className="h-8 w-20"
                    />
                    <span className="text-[12px] text-mv-ink-faint">/ 5</span>
                  </>
                )}
                {badge.type === "quote" && (
                  <Textarea
                    value={badge.text}
                    onChange={(e) => updateBadge(i, { text: e.target.value } as Partial<FooterBadge>)}
                    className="min-h-10 py-1.5 text-[12.5px]"
                    rows={1}
                  />
                )}
                {badge.type === "link" && (
                  <>
                    <Link2 size={14} className="shrink-0 text-mv-ink-faint" />
                    <Input
                      value={badge.url}
                      onChange={(e) => updateBadge(i, { url: e.target.value } as Partial<FooterBadge>)}
                      className="h-8"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeBadge(i)}
                  className="ml-auto shrink-0 rounded p-1 text-mv-ink-faint hover:bg-mv-ink/5 hover:text-mv-ink"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {badges.length === 0 && (
              <p className="text-[12px] text-mv-ink-faint">Aucun badge — le pied de page restera vide.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Right: format, background, live preview, export */}
      <div className="lg:col-span-5 space-y-5">
        <Card>
          <CardHeader eyebrow="Export" title="Format" />
          <div className="grid grid-cols-3 gap-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                className={cn(
                  "rounded-lg border p-2.5 text-left transition-colors",
                  format === f.id ? "border-mv-green bg-mv-green-tint" : "border-mv-border-soft hover:bg-mv-cream-soft"
                )}
              >
                <p className="text-[12px] font-bold text-mv-ink">{f.label}</p>
                <p className="text-[10.5px] text-mv-ink-faint">{f.hint}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Export" title="Arrière-plan" />
          <div className="grid grid-cols-4 gap-2">
            {BACKGROUND_OPTIONS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBackground(b.id)}
                className={cn(
                  "rounded-lg border py-2 text-[11.5px] font-semibold transition-colors",
                  background === b.id ? "border-mv-green bg-mv-green-tint text-mv-ink" : "border-mv-border-soft text-mv-ink-soft hover:bg-mv-cream-soft"
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col items-center space-y-4">
          <div className="flex w-full items-center justify-between border-b border-mv-border-soft pb-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-mv-green-dark flex items-center gap-1.5">
              <Trophy size={14} /> Aperçu
            </span>
          </div>

          {heroDisplay ? (
            <div
              className={cn("overflow-hidden rounded-2xl shadow-mv-md", formatDef.aspectClass)}
              style={{
                width: formatDef.width,
                // Damier visible seulement dans l'aperçu — n'est jamais capturé
                // par html-to-image puisqu'il est sur ce wrapper, pas sur le
                // nœud référencé (mainCardRef) ci-dessous.
                background:
                  background === "transparent"
                    ? "repeating-conic-gradient(#e6e0d0 0% 25%, transparent 0% 50%) 50% / 16px 16px"
                    : undefined,
              }}
            >
              <div ref={mainCardRef} className="h-full w-full">
                <ResultsShareCard
                  restaurantName={restaurantName}
                  logoUrl={logoUrl}
                  hero={heroDisplay}
                  stats={statsDisplay}
                  badges={badges}
                  background={background}
                  slideLabel={format === "carousel" && statsDisplay.length > 0 ? `1 / ${1 + statsDisplay.length}` : undefined}
                />
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-mv-ink-faint">Aucune métrique disponible.</p>
          )}

          {format === "carousel" && statsDisplay.length > 0 && (
            <div className="flex w-full gap-2 overflow-x-auto pb-1">
              {statsDisplay.map((s, i) => (
                <div
                  key={s.id}
                  className="shrink-0 overflow-hidden rounded-xl shadow-mv-sm"
                  style={{ width: THUMBNAIL_WIDTH, height: formatDef.height * thumbnailScale }}
                >
                  {/* Rendered at full export resolution, then shrunk purely
                      visually via CSS transform — downloadNode overrides this
                      transform back to none to capture at full size. */}
                  <div
                    ref={(el) => {
                      spotlightRefs.current[i] = el;
                    }}
                    style={{
                      width: formatDef.width,
                      height: formatDef.height,
                      transform: `scale(${thumbnailScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <ResultsShareCard
                      restaurantName={restaurantName}
                      logoUrl={logoUrl}
                      hero={s}
                      stats={[]}
                      badges={badges}
                      background={background}
                      slideLabel={`${i + 2} / ${1 + statsDisplay.length}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleDownload} disabled={isExporting || !heroDisplay} className="w-full">
            {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {isExporting
              ? "Génération…"
              : format === "carousel"
                ? `Télécharger le carrousel (${1 + statsDisplay.length})`
                : "Télécharger"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
