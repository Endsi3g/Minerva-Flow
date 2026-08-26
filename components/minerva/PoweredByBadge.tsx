import { LogoMark } from "@/components/shell/Logo";
import { cn } from "@/lib/utils";

/** Shown on customer-facing pages this app generates (referral landing, shared reports) — attribution, not a nav element. */
export function PoweredByBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-mv-border bg-mv-cream-soft py-1.5 pr-3 pl-2",
        className
      )}
    >
      <LogoMark size={14} />
      <span className="text-[11px] font-semibold text-mv-ink-faint">Propulsé par Minerva Flow</span>
    </span>
  );
}
