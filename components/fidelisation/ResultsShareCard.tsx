import type { ShareableMetric } from "@/lib/data/retention-metrics";
import { cn } from "@/lib/utils";
import { Star, Quote as QuoteIcon, Link2 } from "lucide-react";

export type CardBackground = "brand" | "white" | "black" | "glass-dark" | "glass-light" | "transparent";

export type CardFormat = "post" | "story" | "carousel" | "landscape" | "square" | "sticker" | "lower-third";

export type TextColor = "auto" | "dark" | "white";

export type FooterBadge =
  | { type: "rating"; value: number; reviewCount?: number }
  | { type: "quote"; text: string; author?: string }
  | { type: "link"; url: string };

export type ResultsShareCardProps = {
  restaurantName: string;
  logoUrl: string | null;
  hero: ShareableMetric;
  stats: ShareableMetric[];
  badges: FooterBadge[];
  background: CardBackground;
  format?: CardFormat;
  textColor?: TextColor;
  /** Slide index label ("1 / 4") shown next to the logo for carousel exports — omit for single-image formats. */
  slideLabel?: string;
};

/**
 * Long workspace names ("Minerva Flow — Démo (Sherbrooke)") don't fit even
 * across 2 lines at a fixed font size on the narrower formats — shrink
 * instead of letting `line-clamp-2` silently truncate them further.
 */
function nameSizeClass(name: string) {
  if (name.length >= 28) return "text-[9.5px]";
  if (name.length >= 18) return "text-[11px]";
  return "text-[12.5px]";
}

export const BACKGROUND_STYLES: Record<
  CardBackground,
  {
    card: string;
    ink: string;
    inkSoft: string;
    borderDivider: string;
    chipBg: string;
    heroBox: string;
    heroText: string;
  }
> = {
  brand: {
    card: "bg-mv-cream-soft",
    ink: "text-mv-ink",
    inkSoft: "text-mv-ink-soft",
    borderDivider: "border-black/5",
    chipBg: "bg-black/[0.04]",
    heroBox: "bg-mv-green-light",
    heroText: "text-mv-green-darker",
  },
  white: {
    card: "bg-white",
    ink: "text-mv-ink",
    inkSoft: "text-mv-ink-soft",
    borderDivider: "border-black/5",
    chipBg: "bg-black/[0.04]",
    heroBox: "bg-mv-green-light",
    heroText: "text-mv-green-darker",
  },
  black: {
    card: "bg-[#0e120d]",
    ink: "text-white",
    inkSoft: "text-white/60",
    borderDivider: "border-white/10",
    chipBg: "bg-white/10",
    heroBox: "bg-mv-green",
    heroText: "text-white",
  },
  "glass-dark": {
    card: "bg-[#0e120d]/80 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40",
    ink: "text-white drop-shadow-sm",
    inkSoft: "text-white/75",
    borderDivider: "border-white/15",
    chipBg: "bg-white/15 border border-white/10",
    heroBox: "bg-mv-green/90 border border-white/20 shadow-md",
    heroText: "text-white",
  },
  "glass-light": {
    card: "bg-white/85 backdrop-blur-xl border border-black/10 shadow-2xl shadow-black/15",
    ink: "text-mv-ink",
    inkSoft: "text-mv-ink-soft",
    borderDivider: "border-black/10",
    chipBg: "bg-black/[0.06] border border-black/5",
    heroBox: "bg-mv-green-light border border-mv-green/20",
    heroText: "text-mv-green-darker",
  },
  transparent: {
    card: "bg-transparent",
    ink: "text-mv-ink drop-shadow-sm",
    inkSoft: "text-mv-ink-soft",
    borderDivider: "border-black/10",
    chipBg: "bg-black/[0.08] backdrop-blur-sm border border-black/5",
    heroBox: "bg-mv-green-light/90 backdrop-blur-sm border border-mv-green/30 shadow-sm",
    heroText: "text-mv-green-darker",
  },
};

/**
 * The Axiom-style results card: Minerva Flow icon (or the restaurant's own
 * logo when set) + restaurant name on the left, "Minerva Flow" wordmark on
 * the right, a green band with one giant "hero" result, up to 3 supporting
 * stats, and a configurable row of minimalist footer badges (rating /
 * quote / link — any combination, any order).
 */
export function ResultsShareCard({
  restaurantName,
  logoUrl,
  hero,
  stats,
  badges,
  background,
  format = "post",
  textColor = "auto",
  slideLabel,
}: ResultsShareCardProps) {
  const baseTheme = BACKGROUND_STYLES[background];
  const isWhiteText =
    textColor === "white" ||
    (textColor === "auto" && (background === "black" || background === "glass-dark"));

  const theme = {
    ...baseTheme,
    ink: isWhiteText ? "text-white drop-shadow-sm" : "text-mv-ink",
    inkSoft: isWhiteText ? "text-white/75" : "text-mv-ink-soft",
    borderDivider: isWhiteText ? "border-white/15" : "border-black/10",
    chipBg: isWhiteText ? "bg-white/15 border border-white/10" : "bg-black/[0.06] border border-black/5",
    heroBox: isWhiteText
      ? "bg-mv-green border border-white/20 shadow-md"
      : background === "transparent"
        ? "bg-mv-green-light/90 backdrop-blur-sm border border-mv-green/30 shadow-sm"
        : baseTheme.heroBox,
    heroText: isWhiteText ? "text-white" : baseTheme.heroText,
  };

  // ==========================================
  // Format 1: Lower-Third (Bandeau horizontal pour incrustation vidéo)
  // ==========================================
  if (format === "lower-third") {
    return (
      <div className={cn("flex h-full w-full items-center justify-between gap-4 p-4 rounded-xl", theme.card)}>
        {/* Left: Brand / Restaurant */}
        <div className="flex min-w-0 items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-black/5"
              crossOrigin="anonymous"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image
            <img src="/icon-512.png" alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" crossOrigin="anonymous" />
          )}
          <div className="min-w-0">
            <p className={cn("truncate font-display text-[13px] font-semibold leading-tight", theme.ink)}>
              {restaurantName}
            </p>
            <p className={cn("text-[10px] font-medium tracking-wide", theme.inkSoft)}>Minerva Flow</p>
          </div>
        </div>

        {/* Center: Hero Pill */}
        <div className={cn("flex items-center gap-2.5 rounded-xl px-3.5 py-1.5 shrink-0", theme.heroBox)}>
          <span className={cn("text-[10.5px] font-bold uppercase tracking-wider", theme.heroText, "opacity-90")}>
            {hero.label} :
          </span>
          <span className={cn("font-display text-[22px] font-extrabold tracking-tight leading-none", theme.heroText)}>
            {hero.formattedValue}
          </span>
        </div>

        {/* Right: Key Stats & Badges inline */}
        <div className="flex items-center gap-3 shrink-0">
          {stats.slice(0, 2).map((s) => (
            <div key={s.id} className="text-right">
              <p className={cn("text-[9.5px] uppercase tracking-wider font-semibold", theme.inkSoft)}>{s.label}</p>
              <p className={cn("font-display text-[12.5px] font-bold", theme.ink)}>{s.formattedValue}</p>
            </div>
          ))}
          {badges[0] && <FooterBadgeChip badge={badges[0]} theme={theme} />}
        </div>
      </div>
    );
  }

  // ==========================================
  // Format 2: Landscape 16:9 (YouTube & Écrans Larges)
  // ==========================================
  if (format === "landscape") {
    return (
      <div className={cn("flex h-full w-full flex-col justify-between p-5 rounded-2xl", theme.card)}>
        {/* Header */}
        <div className={cn("flex items-center justify-between gap-2 border-b pb-2.5", theme.borderDivider)}>
          <div className="flex min-w-0 items-center gap-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image
              <img
                src={logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/5"
                crossOrigin="anonymous"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image
              <img src="/icon-512.png" alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" crossOrigin="anonymous" />
            )}
            <p className={cn("truncate font-display text-[13.5px] font-semibold", theme.ink)}>{restaurantName}</p>
          </div>
          <p className={cn("shrink-0 font-display text-[12.5px] font-semibold tracking-tight", theme.ink)}>Minerva Flow</p>
        </div>

        {/* 2-Column Body */}
        <div className="grid grid-cols-12 gap-5 items-center my-auto py-2">
          {/* Left Column: Hero */}
          <div className="col-span-6 flex flex-col justify-center">
            <p className={cn("mb-1.5 text-[10.5px] font-bold uppercase tracking-wider", theme.inkSoft)}>{hero.label}</p>
            <div className={cn("rounded-xl px-4 py-3.5", theme.heroBox)}>
              <p className={cn("break-words font-display text-[32px] font-extrabold leading-none tracking-tight", theme.heroText)}>
                {hero.formattedValue}
              </p>
            </div>
          </div>

          {/* Right Column: Stats + Badges */}
          <div className="col-span-6 flex flex-col justify-center space-y-2.5">
            {stats.length > 0 && (
              <div className="space-y-1.5">
                {stats.map((s) => (
                  <div key={s.id} className="flex items-baseline justify-between gap-2">
                    <span className={cn("text-[11.5px] truncate", theme.inkSoft)}>{s.label}</span>
                    <span className={cn("shrink-0 text-[12.5px] font-bold", theme.ink)}>{s.formattedValue}</span>
                  </div>
                ))}
              </div>
            )}
            {badges.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {badges.map((b, i) => (
                  <FooterBadgeChip key={i} badge={b} theme={theme} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Format 3: Formats Verticaux / Standards (Post 4:5, Story 9:16, Square 1:1, Sticker, Carousel)
  // ==========================================
  return (
    <div className={cn("flex h-full w-full flex-col justify-between p-5 rounded-2xl", theme.card)}>
      {/* Header: logo/name (left) — "Minerva Flow" wordmark (right) */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image
            <img
              src={logoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/5"
              crossOrigin="anonymous"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image
            <img src="/icon-512.png" alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" crossOrigin="anonymous" />
          )}
          <div className="min-w-0">
            <p
              className={cn(
                "line-clamp-2 break-words font-display font-semibold leading-[1.2]",
                nameSizeClass(restaurantName),
                theme.ink
              )}
            >
              {restaurantName}
            </p>
            {slideLabel && (
              <p className={cn("mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider", theme.inkSoft)}>
                {slideLabel}
              </p>
            )}
          </div>
        </div>
        <p className={cn("shrink-0 font-display text-[13px] font-semibold tracking-tight", theme.ink)}>Minerva Flow</p>
      </div>

      {/* Hero result: the big win, in the green band */}
      <div className="my-3.5">
        <p className={cn("mb-1 text-[10.5px] font-bold uppercase tracking-wider", theme.inkSoft)}>{hero.label}</p>
        <div className={cn("rounded-xl px-3.5 py-2.5", theme.heroBox)}>
          <p className={cn("break-words font-display text-[34px] font-extrabold leading-none tracking-tight", theme.heroText)}>
            {hero.formattedValue}
          </p>
        </div>
      </div>

      {/* Supporting stats, two columns (label / value) like a trading recap */}
      {stats.length > 0 && (
        <div className={cn("space-y-1.5 border-t pt-2.5", theme.borderDivider)}>
          {stats.map((s) => (
            <div key={s.id} className="flex items-baseline justify-between gap-3">
              <span className={cn("text-[11.5px]", theme.inkSoft)}>{s.label}</span>
              <span className={cn("shrink-0 text-[12.5px] font-bold", theme.ink)}>{s.formattedValue}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer badges: any combination of rating / quote / link, minimalist */}
      {badges.length > 0 && (
        <div className={cn("mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5", theme.borderDivider)}>
          {badges.map((b, i) => (
            <FooterBadgeChip key={i} badge={b} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}

function FooterBadgeChip({
  badge,
  theme,
}: {
  badge: FooterBadge;
  theme: { card: string; ink: string; inkSoft: string; chipBg: string };
}) {
  const chipClass = cn(
    "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-semibold",
    theme.chipBg,
    theme.ink
  );

  if (badge.type === "rating") {
    return (
      <span className={chipClass}>
        <Star size={10} className="fill-amber-400 text-amber-400" />
        {badge.value.toFixed(1)}
        {badge.reviewCount ? ` · ${badge.reviewCount} avis` : ""}
      </span>
    );
  }
  if (badge.type === "quote") {
    return (
      <span className={cn(chipClass, "max-w-[150px] truncate")}>
        <QuoteIcon size={10} className="shrink-0" />
        {badge.text}
        {badge.author ? ` — ${badge.author}` : ""}
      </span>
    );
  }
  return (
    <span className={cn(chipClass, "max-w-[150px] truncate")}>
      <Link2 size={10} className="shrink-0" />
      {badge.url.replace(/^https?:\/\//, "")}
    </span>
  );
}
