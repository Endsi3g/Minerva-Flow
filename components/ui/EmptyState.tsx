import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
      <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark">
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
