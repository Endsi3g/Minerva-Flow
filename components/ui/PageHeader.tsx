import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageHeader({
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
      data-slot="page-header"
      className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}
    >
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-mv-green-dark">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-[26px] font-medium tracking-tight text-mv-ink">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-mv-ink-soft">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

