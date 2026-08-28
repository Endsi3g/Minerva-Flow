"use client";

import React from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import type { GenerativeAlertData, AlertSeverity } from "@/lib/types/generative-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    icon: typeof AlertCircle;
    container: string;
    iconColor: string;
    badge: string;
    button: string;
  }
> = {
  critical: {
    icon: AlertCircle,
    container: "bg-rose-50/70 border-rose-200 text-rose-950",
    iconColor: "text-rose-600",
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    button: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  warning: {
    icon: AlertTriangle,
    container: "bg-amber-50/70 border-amber-200 text-amber-950",
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    button: "bg-amber-700 hover:bg-amber-800 text-white",
  },
  info: {
    icon: Info,
    container: "bg-blue-50/70 border-blue-200 text-blue-950",
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  success: {
    icon: CheckCircle2,
    container: "bg-emerald-50/70 border-emerald-200 text-emerald-950",
    iconColor: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    button: "bg-[#0E7C5A] hover:bg-[#0A6348] text-white",
  },
};

export function GenerativeAlertBanner({
  alert,
  onActionClick,
}: {
  alert: GenerativeAlertData;
  onActionClick?: (promptText: string) => void;
}) {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.warning;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5 sm:p-4 my-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs",
        config.container
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className={cn("p-1 rounded-lg shrink-0 mt-0.5", config.iconColor)}>
          <Icon size={16} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h5 className="font-sans font-bold text-xs sm:text-sm text-[#1F1E1D]">
              {alert.title}
            </h5>
            {alert.metricHighlight && (
              <span
                className={cn(
                  "px-2 py-0.2 text-[10px] font-bold rounded-full border",
                  config.badge
                )}
              >
                {alert.metricHighlight}
              </span>
            )}
          </div>

          <p className="text-xs text-[#5A5851] leading-relaxed">
            {alert.description}
          </p>
        </div>
      </div>

      {/* Action CTA */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {alert.actionPrompt && (
          <button
            type="button"
            onClick={() => onActionClick?.(alert.actionPrompt!)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs",
              config.button
            )}
          >
            <span>{alert.actionLabel || "Résoudre avec l'IA"}</span>
            <ArrowRight size={12} />
          </button>
        )}

        {alert.actionUrl && (
          <Link
            href={alert.actionUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-gray-50 border border-[#E2E0D8] text-[#1F1E1D] transition-colors shadow-2xs"
          >
            <span>Voir</span>
            <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}
