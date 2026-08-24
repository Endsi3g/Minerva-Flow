import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type AlertBannerTone = "info" | "warning" | "error" | "success" | "neutral";

const toneStyles: Record<
  AlertBannerTone,
  { container: string; iconColor: string; defaultIcon: LucideIcon }
> = {
  info: {
    container:
      "border-blue-500/20 bg-blue-50/50 text-blue-950 dark:bg-blue-950/20 dark:text-blue-100 dark:border-blue-500/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    defaultIcon: Info,
  },
  warning: {
    container:
      "border-mv-amber/30 bg-mv-amber-bg text-[#5c420e] dark:bg-[#3a3018]/50 dark:text-amber-200 dark:border-mv-amber/40",
    iconColor: "text-mv-amber",
    defaultIcon: AlertTriangle,
  },
  error: {
    container:
      "border-mv-red/30 bg-mv-red-bg text-[#6b251d] dark:bg-[#3a1f1c]/50 dark:text-red-200 dark:border-mv-red/40",
    iconColor: "text-mv-red",
    defaultIcon: AlertCircle,
  },
  success: {
    container:
      "border-mv-green/30 bg-mv-green-tint text-mv-green-darker dark:bg-[#12241c]/60 dark:text-mv-green-light dark:border-mv-green/40",
    iconColor: "text-mv-green-dark",
    defaultIcon: CheckCircle2,
  },
  neutral: {
    container:
      "border-mv-border bg-mv-surface text-mv-ink dark:bg-mv-surface dark:border-mv-border",
    iconColor: "text-mv-ink-soft",
    defaultIcon: Info,
  },
};

export function AlertBanner({
  tone = "info",
  title,
  children,
  icon,
  action,
  onDismiss,
  className,
}: {
  tone?: AlertBannerTone;
  title?: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const config = toneStyles[tone] || toneStyles.info;
  const IconComponent = icon || config.defaultIcon;

  return (
    <div
      data-slot="alert-banner"
      className={cn(
        "relative flex items-start gap-3 rounded-xl border p-4 text-[13.5px] leading-relaxed shadow-mv-sm transition-all",
        config.container,
        className
      )}
    >
      <div className={cn("mt-0.5 shrink-0", config.iconColor)}>
        <IconComponent size={18} strokeWidth={2.2} />
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold tracking-tight text-[13.5px] mb-0.5">
            {title}
          </p>
        )}
        <div className="text-opacity-90">{children}</div>
        {action && <div className="mt-2.5 flex items-center gap-2">{action}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-current opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
          aria-label="Fermer"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
