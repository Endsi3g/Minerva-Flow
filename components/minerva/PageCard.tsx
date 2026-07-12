import {
  Card as ShadcnCard,
  CardHeader as ShadcnCardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className,
  padded = true,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; padded?: boolean }) {
  return (
    <ShadcnCard
      className={cn(
        "rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm ring-0",
        padded && "p-5",
        className
      )}
      {...rest}
    >
      {children}
    </ShadcnCard>
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
    <ShadcnCardHeader className="mb-4 grid-cols-[1fr_auto] px-0">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">
            {eyebrow}
          </p>
        )}
        <CardTitle className="font-display text-[17px] font-medium text-mv-ink">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="mt-0.5 text-[13px] text-mv-ink-soft">
            {description}
          </CardDescription>
        )}
      </div>
      {action && <CardAction>{action}</CardAction>}
    </ShadcnCardHeader>
  );
}
