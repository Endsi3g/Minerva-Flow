"use client";

import React, { useEffect, useRef, useState } from "react";
import { 
  TrendingUp, 
  UtensilsCrossed, 
  BarChart3, 
  AlertTriangle, 
  PackageCheck, 
  Percent, 
  Boxes,
  Sparkles,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  trigger: "/" | "@";
  label: string;
  category: string;
  desc: string;
  promptSnippet: string;
  icon: React.ElementType;
  badgeTone?: "green" | "amber" | "purple" | "blue" | "red";
}

export const AVAILABLE_COMMANDS: CommandItem[] = [
  // Slash Commands (/)
  {
    id: "cmd-plan",
    trigger: "/",
    label: "/plan",
    category: "Opérations",
    desc: "Générer un plan d'action opérationnel pour les stocks et achats",
    promptSnippet: "Génère un plan d'action opérationnel complet pour optimiser les achats et la gestion des stocks de la semaine à venir.",
    icon: PackageCheck,
    badgeTone: "blue",
  },
  {
    id: "cmd-audit",
    trigger: "/",
    label: "/audit",
    category: "Rentabilité",
    desc: "Analyser les revenus, marges brutes et leviers de rentabilité",
    promptSnippet: "Fais une analyse détaillée des revenus et de la marge brute. Où se situent les principales opportunités d'optimisation ?",
    icon: TrendingUp,
    badgeTone: "green",
  },
  {
    id: "cmd-menu",
    trigger: "/",
    label: "/menu",
    category: "Menu Engineering",
    desc: "Catégoriser les plats Stars, Plowhorses, Puzzles et Dogs",
    promptSnippet: "Analyse mes plats phares et mes marges pour catégoriser la carte selon la matrice de rentabilité du menu engineering.",
    icon: UtensilsCrossed,
    badgeTone: "amber",
  },
  {
    id: "cmd-marge",
    trigger: "/",
    label: "/marge",
    category: "Finance",
    desc: "Auditer la marge brute et détecter les dérives de coûts matières",
    promptSnippet: "Analyse l'évolution du taux de marge brute sur le mois en cours et identifie les anomalies de food cost.",
    icon: Percent,
    badgeTone: "purple",
  },
  {
    id: "cmd-panier",
    trigger: "/",
    label: "/panier",
    category: "Rapports",
    desc: "Synthèse de l'évolution du panier moyen et volume de couverts",
    promptSnippet: "Génère une synthèse graphique de l'évolution du panier moyen et des volumes de couverts par rapport aux programmes actifs.",
    icon: BarChart3,
    badgeTone: "purple",
  },
  {
    id: "cmd-stocks",
    trigger: "/",
    label: "/stocks",
    category: "Inventaire",
    desc: "Identifier les ruptures et recommander les réapprovisionnements",
    promptSnippet: "Vérifie les niveaux de stocks actuels, alerte sur les ruptures potentielles et prépare la liste de commande fournisseur.",
    icon: Boxes,
    badgeTone: "blue",
  },

  // Context Mentions (@)
  {
    id: "ctx-ventes",
    trigger: "@",
    label: "@ventes",
    category: "Données POS",
    desc: "Injecter le chiffre d'affaires et les volumes de vente récents",
    promptSnippet: "[Données Ventes Actives] Analyse en détail la performance des ventes récentes : ",
    icon: Database,
    badgeTone: "green",
  },
  {
    id: "ctx-alertes",
    trigger: "@",
    label: "@alertes",
    category: "Vigilance",
    desc: "Injecter les alertes d'exploitation et jours non saisis",
    promptSnippet: "[Alertes Actives] Propose des actions pour corriger les alertes d'exploitation prioritaires : ",
    icon: AlertTriangle,
    badgeTone: "amber",
  },
  {
    id: "ctx-programmes",
    trigger: "@",
    label: "@programmes",
    category: "Opérations",
    desc: "Injecter les segments actifs (Terrasse, 5 à 7, Brunch)",
    promptSnippet: "[Programmes d'exploitation] Évalue la rentabilité comparée de nos programmes d'exploitation actifs : ",
    icon: Sparkles,
    badgeTone: "blue",
  },
  {
    id: "ctx-carte",
    trigger: "@",
    label: "@carte",
    category: "Menu",
    desc: "Injecter les fiches recettes et marges par plat",
    promptSnippet: "[Carte & Recettes] Audit des fiches techniques et coûts portions : ",
    icon: UtensilsCrossed,
    badgeTone: "amber",
  },
];

interface ChatCommandPopoverProps {
  query: string;
  triggerType: "/" | "@";
  onSelect: (item: CommandItem) => void;
  onClose: () => void;
}

export function ChatCommandPopover({
  query,
  triggerType,
  onSelect,
  onClose,
}: ChatCommandPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const cleanQuery = query.toLowerCase().trim();
  const filtered = AVAILABLE_COMMANDS.filter((cmd) => {
    if (cmd.trigger !== triggerType) return false;
    if (!cleanQuery) return true;
    return (
      cmd.label.toLowerCase().includes(cleanQuery) ||
      cmd.desc.toLowerCase().includes(cleanQuery) ||
      cmd.category.toLowerCase().includes(cleanQuery)
    );
  });

  const safeIndex = filtered.length > 0 ? selectedIndex % filtered.length : 0;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filtered[safeIndex]) {
          onSelect(filtered[safeIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, safeIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full max-w-lg rounded-2xl border border-mv-border/90 bg-mv-surface/98 p-1.5 shadow-mv-lg backdrop-blur-md z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-mv-border/40 text-[10.5px] font-semibold text-mv-ink-faint">
        <span className="flex items-center gap-1.5">
          {triggerType === "/" ? (
            <>
              <span className="rounded bg-mv-cream-soft px-1.5 py-0.5 font-mono text-mv-ink">/</span>
              Commandes d&apos;analyse rapide
            </>
          ) : (
            <>
              <span className="rounded bg-mv-cream-soft px-1.5 py-0.5 font-mono text-mv-ink">@</span>
              Injection de données contextuelles
            </>
          )}
        </span>
        <span className="text-[10px] text-mv-ink-faint">
          <kbd className="font-mono bg-mv-cream-soft px-1 py-0.5 rounded border border-mv-border/60">↑↓</kbd> naviguer · <kbd className="font-mono bg-mv-cream-soft px-1 py-0.5 rounded border border-mv-border/60">Entrée</kbd> valider
        </span>
      </div>

      <div ref={listRef} className="max-h-56 overflow-y-auto py-1 space-y-0.5">
        {filtered.map((item, idx) => {
          const Icon = item.icon;
          const isSelected = idx === safeIndex;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors",
                isSelected
                  ? "bg-mv-cream text-mv-ink shadow-2xs"
                  : "text-mv-ink-soft hover:bg-mv-cream-soft hover:text-mv-ink"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs transition-colors",
                    isSelected
                      ? "border-mv-green/30 bg-mv-green-tint text-mv-green-dark"
                      : "border-mv-border/60 bg-mv-surface text-mv-ink-faint"
                  )}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12.5px] font-bold text-mv-ink">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[9.5px] font-semibold",
                        item.badgeTone === "green" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                        item.badgeTone === "amber" && "bg-amber-50 text-amber-800 border border-amber-200",
                        item.badgeTone === "blue" && "bg-blue-50 text-blue-700 border border-blue-200",
                        item.badgeTone === "purple" && "bg-purple-50 text-purple-700 border border-purple-200",
                        item.badgeTone === "red" && "bg-red-50 text-red-700 border border-red-200"
                      )}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-mv-ink-soft truncate leading-tight mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-mv-green-dark shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                Sélectionner →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
