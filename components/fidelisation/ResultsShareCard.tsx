import type { ShareableMetric } from "@/lib/data/retention-metrics";
import { cn } from "@/lib/utils";
import { Star, Quote as QuoteIcon, Link2 } from "lucide-react";

export type CardBackground = "brand" | "white" | "black" | "transparent";

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
  /** Slide index label ("1 / 4") shown next to the logo for carousel exports — omit for single-image formats. */
  slideLabel?: string;
};

const BACKGROUND_STYLES: Record<CardBackground, { card: string; ink: string; inkSoft: string }> = {
  brand: { card: "bg-mv-cream-soft", ink: "text-mv-ink", inkSoft: "text-mv-ink-soft" },
  white: { card: "bg-white", ink: "text-mv-ink", inkSoft: "text-mv-ink-soft" },
  black: { card: "bg-[#0e120d]", ink: "text-white", inkSoft: "text-white/60" },
  transparent: { card: "bg-transparent", ink: "text-mv-ink", inkSoft: "text-mv-ink-soft" },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/**
 * The Axiom-style results card: logo top-left + restaurant name, "Minerva
 * Flow" wordmark top-right, a green band with one giant "hero" result,
 * up to 3 supporting stats in two columns, and a configurable row of
 * minimalist footer badges (rating / quote / link — any combination).
 * Pure presentational — the parent controls size via a wrapping aspect-ratio
 * box and captures this with html-to-image, same pattern as MarketingStudioView.
 */
export function ResultsShareCard({
  restaurantName,
  logoUrl,
  hero,
  stats,
  badges,
  background,
  slideLabel,
}: ResultsShareCardProps) {
  const theme = BACKGROUND_STYLES[background];

  return (
    <div className={cn("flex h-full w-full flex-col justify-between p-6", theme.card)}>
      {/* Header: restaurant logo/name (left) — "Minerva Flow" wordmark (right) */}
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image, needs a real <img>
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-black/5"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mv-green text-[13px] font-bold text-white">
              {initials(restaurantName) || "MF"}
            </div>
          )}
          <div className="min-w-0">
            <p className={cn("truncate text-[13px] font-bold leading-tight", theme.ink)}>{restaurantName}</p>
            {slideLabel && (
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", theme.inkSoft)}>{slideLabel}</p>
            )}
          </div>
        </div>
        <p className={cn("shrink-0 pl-2 font-display text-[15px] font-semibold tracking-tight", theme.ink)}>
          Minerva Flow
        </p>
      </div>

      {/* Hero result: the big win, in the green band */}
      <div className="my-5">
        <p className={cn("mb-1.5 text-[11px] font-bold uppercase tracking-wider", theme.inkSoft)}>{hero.label}</p>
        <div className="rounded-xl bg-mv-green-light px-4 py-3.5">
          <p className="font-display text-[40px] font-extrabold leading-none tracking-tight text-mv-green-darker">
            {hero.formattedValue}
          </p>
        </div>
      </div>

      {/* Supporting stats, two columns (label / value) like a trading recap */}
      {stats.length > 0 && (
        <div className="space-y-2 border-t border-black/5 pt-3.5">
          {stats.map((s) => (
            <div key={s.id} className="flex items-baseline justify-between gap-3">
              <span className={cn("text-[12px]", theme.inkSoft)}>{s.label}</span>
              <span className={cn("text-[13px] font-bold", theme.ink)}>{s.formattedValue}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer badges: any combination of rating / quote / link, minimalist */}
      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-black/5 pt-3.5">
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
  theme: { card: string; ink: string; inkSoft: string };
}) {
  const chipClass = cn(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold",
    theme.card === "bg-[#0e120d]" ? "bg-white/10" : "bg-black/[0.04]",
    theme.ink
  );

  if (badge.type === "rating") {
    return (
      <span className={chipClass}>
        <Star size={11} className="fill-amber-400 text-amber-400" />
        {badge.value.toFixed(1)}
        {badge.reviewCount ? ` · ${badge.reviewCount} avis` : ""}
      </span>
    );
  }
  if (badge.type === "quote") {
    return (
      <span className={cn(chipClass, "max-w-[220px] truncate")}>
        <QuoteIcon size={11} className="shrink-0" />
        {badge.text}
        {badge.author ? ` — ${badge.author}` : ""}
      </span>
    );
  }
  return (
    <span className={chipClass}>
      <Link2 size={11} className="shrink-0" />
      {badge.url.replace(/^https?:\/\//, "")}
    </span>
  );
}
