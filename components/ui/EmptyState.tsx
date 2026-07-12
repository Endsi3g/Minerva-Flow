import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

function EmptyPlateIllustration() {
  return (
    <svg width="88" height="64" viewBox="0 0 88 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="44" cy="54" rx="34" ry="5" fill="var(--mv-border-soft)" />
      <ellipse
        cx="44"
        cy="30"
        rx="30"
        ry="22"
        fill="var(--mv-surface)"
        stroke="var(--mv-border)"
        strokeWidth="2"
      />
      <ellipse
        cx="44"
        cy="30"
        rx="18"
        ry="13"
        fill="none"
        stroke="var(--mv-border)"
        strokeWidth="1.5"
        strokeDasharray="3 4"
      />
      <path
        d="M20 14 C22 10 26 12 24 16"
        stroke="var(--mv-ink-faint)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="66" cy="12" r="3.5" fill="var(--mv-lime-tint)" stroke="var(--mv-lime-dark)" strokeWidth="1.2" />
    </svg>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mv-animate-in flex flex-col items-center justify-center rounded-2xl border border-dashed border-mv-border bg-mv-cream-soft px-6 py-14 text-center">
      <EmptyPlateIllustration />
      <div className="mt-3 mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
        <Icon size={17} strokeWidth={2} />
      </div>
      <p className="font-display text-[16px] font-medium text-mv-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-mv-ink-soft">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
