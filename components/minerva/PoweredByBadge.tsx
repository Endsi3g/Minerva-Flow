import { LogoMark } from "@/components/shell/Logo";
import { cn } from "@/lib/utils";

const MARKETING_SITE_URL = "https://minervaflow.framer.website/";

/**
 * Shown on customer-facing pages this app generates (referral landing,
 * shared reports) — attribution AND a growth loop back to the marketing
 * site, so it links out rather than sitting as inert text.
 */
export function PoweredByBadge({ className }: { className?: string }) {
  return (
    <a
      href={`${MARKETING_SITE_URL}?ref=powered-by-badge`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-cream-soft py-1.5 pr-3 pl-2 transition-colors hover:border-mv-green/40 hover:bg-mv-green-tint",
        className
      )}
    >
      <LogoMark size={14} />
      <span className="text-[11px] font-semibold text-mv-ink-faint">Propulsé par Minerva Flow</span>
    </a>
  );
}
