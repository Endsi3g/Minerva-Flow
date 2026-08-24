import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = "default",
  variant = "dashed",
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  size?: "sm" | "default" | "lg";
  variant?: "dashed" | "card" | "plain";
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "mv-animate-in flex flex-col items-center justify-center text-center",
        variant === "dashed" &&
          "rounded-2xl border border-dashed border-mv-border bg-mv-cream-soft/60",
        variant === "card" &&
          "rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm",
        variant === "plain" && "bg-transparent",
        size === "sm" && "px-4 py-8",
        size === "default" && "px-6 py-12",
        size === "lg" && "px-8 py-16",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-mv-green-tint text-mv-green-dark shadow-mv-sm",
          size === "sm" && "mb-2 h-8 w-8",
          size === "default" && "mb-3 h-10 w-10",
          size === "lg" && "mb-4 h-12 w-12"
        )}
      >
        <Icon
          size={size === "sm" ? 16 : size === "lg" ? 22 : 18}
          strokeWidth={2}
        />
      </div>
      <p
        className={cn(
          "font-display font-medium text-mv-ink",
          size === "sm" && "text-[14.5px]",
          size === "default" && "text-[16px]",
          size === "lg" && "text-[18px]"
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "mt-1.5 max-w-sm leading-relaxed text-mv-ink-soft",
            size === "sm" ? "text-[12px]" : "text-[13px]"
          )}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

