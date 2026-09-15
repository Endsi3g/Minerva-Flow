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

const BACKGROUND_STYLES: Record<CardBackground, { card: string; ink: string; inkSoft: string }> = {
  brand: { card: "bg-mv-cream-soft", ink: "text-mv-ink", inkSoft: "text-mv-ink-soft" },
  white: { card: "bg-white", ink: "text-mv-ink", inkSoft: "text-mv-ink-soft" },
  black: { card: "bg-[#0e120d]", ink: "text-white", inkSoft: "text-white/60" },
  transparent: { card: "bg-transparent", ink: "text-mv-ink", inkSoft: "text-mv-ink-soft" },
};

/**
 * The Axiom-style results card: Minerva Flow icon (or the restaurant's own
 * logo when set) + restaurant name on the left, "Minerva Flow" wordmark on
 * the right, a green band with one giant "hero" result, up to 3 supporting
 * stats, and a configurable row of minimalist footer badges (rating /
 * quote / link — any combination, any order).
 *
 * Every size below (paddings, gaps, font sizes) was tuned against the
 * tightest real case — 3 stats + all 3 footer badges at once, in every
 * export format — so nothing gets clipped by the parent's fixed
 * aspect-ratio + overflow-hidden box. Change a size? Re-check that case.
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
    <div className={cn("flex h-full w-full flex-col justify-between p-5", theme.card)}>
      {/* Header: logo/name (left) — "Minerva Flow" wordmark (right) */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image, needs a real <img>
            <img
              src={logoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/5"
              crossOrigin="anonymous"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- captured by html-to-image, needs a real <img>
            <img src="/icon-512.png" alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" crossOrigin="anonymous" />
          )}
          <div className="min-w-0">
            {/* Wraps up to 2 lines instead of a 1-line ellipsis truncation —
                these names ("Minerva Flow — Démo (Sherbrooke)") are long
                enough that a single-line clip left almost nothing legible. */}
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
        <div className="rounded-xl bg-mv-green-light px-3.5 py-2.5">
          <p className="break-words font-display text-[34px] font-extrabold leading-none tracking-tight text-mv-green-darker">
            {hero.formattedValue}
          </p>
        </div>
      </div>

      {/* Supporting stats, two columns (label / value) like a trading recap */}
      {stats.length > 0 && (
        <div className="space-y-1.5 border-t border-black/5 pt-2.5">
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
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-black/5 pt-2.5">
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
    "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-semibold",
    theme.card === "bg-[#0e120d]" ? "bg-white/10" : "bg-black/[0.04]",
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
