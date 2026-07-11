import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className,
  padded = true,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; padded?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm",
        padded && "p-5",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
            {eyebrow}
          </p>
        )}
        <h3 className="font-display text-[17px] font-medium text-mv-ink">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[13px] text-mv-ink-soft">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
