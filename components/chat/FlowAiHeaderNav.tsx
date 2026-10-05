"use client";


import { useTranslations } from "next-intl";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Zap,
  BarChart3,
  ArrowLeft,
  Store,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/Button";

function buildNAV_TABS(t: (key: string) => string) {
  return [
  {
    href: "/assistant",
    label: "Assistant",
    icon: Brain,
    description: "Chat conversationnel Flow AI",
  },
  {
    href: "/assistant/agents",
    label: "Agents Store",
    icon: Store,
    description: t("businessSpecialistsAgentCreation"),
  },
  {
    href: "/assistant/skills",
    label: t("capabilitiesSkills"),
    icon: Zap,
    description: t("registryOfToolsAnd"),
  },
  {
    href: "/assistant/intelligence",
    label: t("operationalIntelligence"),
    icon: BarChart3,
    description: t("dailyBriefingPrimeCost"),
  },
];
}

export function FlowAiHeaderNav({
  restaurantName,
  activeSpecialistName,
  activeSpecialistAvatar,
  onToggleSidebar,
}: {
  restaurantName?: string;
  activeSpecialistName?: string;
  activeSpecialistAvatar?: string;
  onToggleSidebar?: () => void;
}) {
  const t = useTranslations("flowAiHeader");
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-mv-surface border-b border-mv-border select-none shrink-0">
      {/* ── Gauche : Marque, Retour & Toggle Sidebar ──────────────────────────── */}
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/overview"
                className="flex items-center gap-1.5 text-[12px] font-medium text-mv-ink-soft hover:text-mv-ink px-2 py-1 rounded-lg hover:bg-mv-cream transition-colors"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">{t("overview")}</span>
              </Link>
            }
          />
          <TooltipContent>{t("backToTheDashboard")}</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-mv-border" />

        {onToggleSidebar && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleSidebar}
                  className="h-8 w-8 p-0 text-mv-ink-soft hover:text-mv-ink"
                >
                  <PanelLeft size={16} />
                </Button>
              }
            />
            <TooltipContent>{t("hideShowTheSessions")}</TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-[16px] text-mv-ink tracking-tight flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-mv-green inline-block animate-pulse" />
            Minerva Flow AI
          </span>
          {restaurantName && (
            <span className="hidden md:inline-block text-[12px] px-2 py-0.5 rounded-full bg-mv-cream font-medium text-mv-ink-soft border border-mv-border-soft">
              {restaurantName}
            </span>
          )}
        </div>
      </div>

      {/* ── Centre : Onglets de Navigation Flow AI ────────────────────────────── */}
      <nav className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-xl border border-mv-border-soft">
        {buildNAV_TABS(t).map((tab) => {
          const Icon = tab.icon;
          const isExact = pathname.endsWith(tab.href);
          const isAssistantRoot =
            tab.href === "/assistant" &&
            (pathname.endsWith("/assistant") ||
              pathname.includes("/assistant/") &&
                !pathname.includes("/agents") &&
                !pathname.includes("/skills") &&
                !pathname.includes("/intelligence"));
          const isActive = isExact || isAssistantRoot;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                isActive
                  ? "bg-white text-mv-green-dark shadow-xs font-semibold"
                  : "text-mv-ink-soft hover:text-mv-ink hover:bg-white/50"
              )}
            >
              <Icon size={13} className={isActive ? "text-mv-green" : "text-mv-ink-faint"} />
              <span className="hidden md:inline">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Droite : Spécialiste Actif ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {activeSpecialistName && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mv-green-tint text-mv-green-dark text-[12px] font-medium border border-mv-green/20">
            <span>{activeSpecialistAvatar ?? "👨‍🍳"}</span>
            <span>{activeSpecialistName}</span>
          </div>
        )}
      </div>
    </header>
  );
}
