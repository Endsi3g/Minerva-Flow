import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  badge,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="section-header"
      className={cn("mb-4 flex flex-wrap items-center justify-between gap-3", className)}
    >
      <div>
        {eyebrow && (
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-mv-ink-faint">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[18px] font-medium text-mv-ink">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="mt-0.5 text-[13px] text-mv-ink-soft">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
