"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Sparkles,
  Zap,
  BarChart3,
  ArrowLeft,
  Store,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/Button";

const NAV_TABS = [
  {
    href: "/assistant",
    label: "Assistant & Canvas",
    icon: Brain,
    description: "Chat conversationnel & Éditeur TipTap latéral",
  },
  {
    href: "/assistant/agents",
    label: "Agents Store",
    icon: Store,
    description: "Spécialistes métier & Création d'agents",
  },
  {
    href: "/assistant/skills",
    label: "Capacités (Skills)",
    icon: Zap,
    description: "Registre des outils et actions automatisées",
  },
  {
    href: "/assistant/intelligence",
    label: "Intelligence Opérationnelle",
    icon: BarChart3,
    description: "Briefing du jour, alertes Prime Cost & audit",
  },
];

export function FlowAiHeaderNav({
  restaurantName,
  activeSpecialistName,
  activeSpecialistAvatar,
  onToggleSidebar,
  onToggleCanvas,
}: {
  restaurantName?: string;
  activeSpecialistName?: string;
  activeSpecialistAvatar?: string;
  onToggleSidebar?: () => void;
  onToggleCanvas?: () => void;
}) {
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
                <span className="hidden sm:inline">Aperçu</span>
              </Link>
            }
          />
          <TooltipContent>Retour au tableau de bord</TooltipContent>
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
            <TooltipContent>Masquer/Afficher le volet sessions (Cmd+B)</TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-[16px] text-mv-ink tracking-tight flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-mv-green inline-block animate-pulse" />
            Minerva Flow AI
          </span>
          {restaurantName && (
            <span className="hidden md:inline-block text-[11px] px-2 py-0.5 rounded-full bg-mv-cream font-medium text-mv-ink-soft border border-mv-border-soft">
              {restaurantName}
            </span>
          )}
        </div>
      </div>

      {/* ── Centre : Onglets de Navigation Flow AI ────────────────────────────── */}
      <nav className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-xl border border-mv-border-soft">
        {NAV_TABS.map((tab) => {
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

      {/* ── Droite : Spécialiste Actif & Toggle Canvas ────────────────────────── */}
      <div className="flex items-center gap-2">
        {activeSpecialistName && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mv-green-tint text-mv-green-dark text-[11px] font-medium border border-mv-green/20">
            <span>{activeSpecialistAvatar ?? "👨‍🍳"}</span>
            <span>{activeSpecialistName}</span>
          </div>
        )}

        {onToggleCanvas && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCanvas}
                  className="h-8 w-8 p-0 text-mv-ink-soft hover:text-mv-ink"
                >
                  <PanelRight size={16} />
                </Button>
              }
            />
            <TooltipContent>Masquer/Afficher le Canvas TipTap (Cmd+J)</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
