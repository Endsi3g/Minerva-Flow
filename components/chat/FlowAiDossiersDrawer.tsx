"use client";

import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  CheckSquare,
  Square,
  Plus,
  ChevronDown,
  ChevronRight,
  UtensilsCrossed,
  TrendingUp,
  HeartHandshake,
  Users,
  FolderArchive,
  Info,
  FileText,
  Sparkles,
} from "lucide-react";
import { DEFAULT_DOSSIERS, type DossierSlug } from "@/lib/ai/dossier-types";
import { executeUpdateDossiersAction } from "@/app/[locale]/(chat)/assistant/flow-ai-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ICONS_MAP: Record<string, React.ReactNode> = {
  UtensilsCrossed: <UtensilsCrossed size={14} className="text-mv-green" />,
  TrendingUp: <TrendingUp size={14} className="text-mv-amber" />,
  HeartHandshake: <HeartHandshake size={14} className="text-blue-600" />,
  Users: <Users size={14} className="text-purple-600" />,
  FolderArchive: <FolderArchive size={14} className="text-emerald-700" />,
};

export function FlowAiDossiersDrawer({
  conversationId,
  restaurantId,
  initialActiveDossiers,
  onDossiersChange,
}: {
  conversationId: string;
  restaurantId: string;
  initialActiveDossiers?: string[];
  onDossiersChange?: (dossiers: string[]) => void;
}) {
  const [activeDossiers, setActiveDossiers] = useState<string[]>(
    initialActiveDossiers && initialActiveDossiers.length > 0
      ? initialActiveDossiers
      : ["menu", "finance", "loyalty", "operations"]
  );
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [newSopOpen, setNewSopOpen] = useState(false);
  const [sopTitle, setSopTitle] = useState("");
  const [sopContent, setSopContent] = useState("");
  const [isSubmittingSop, setIsSubmittingSop] = useState(false);

  const toggleDossier = async (slug: string) => {
    const next = activeDossiers.includes(slug)
      ? activeDossiers.filter((s) => s !== slug)
      : [...activeDossiers, slug];

    setActiveDossiers(next);
    if (onDossiersChange) onDossiersChange(next);
    await executeUpdateDossiersAction(conversationId, next);
    toast.success("Contexte RAG mis à jour pour cette conversation");
  };

  const handleAddSop = async () => {
    if (!sopTitle.trim() || !sopContent.trim()) {
      toast.error("Veuillez remplir le titre et le contenu de la consigne.");
      return;
    }
    setIsSubmittingSop(true);
    try {
      // Insertion dans le canvas et active le dossier custom
      const customEvent = new CustomEvent("minerva_insert_canvas", {
        detail: {
          title: `SOP : ${sopTitle}`,
          content: `<h3>Protocole : ${sopTitle}</h3><p>${sopContent.replace(/\n/g, "<br/>")}</p>`,
        },
      });
      window.dispatchEvent(customEvent);

      if (!activeDossiers.includes("custom")) {
        await toggleDossier("custom");
      }

      setNewSopOpen(false);
      setSopTitle("");
      setSopContent("");
      toast.success("SOP ajoutée à la base de connaissances et au Canvas !");
    } catch {
      toast.error("Erreur lors de l'enregistrement de la SOP");
    } finally {
      setIsSubmittingSop(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-mv-surface border border-mv-border-soft rounded-xl">
      <div className="flex items-center justify-between pb-2 border-b border-mv-border-soft">
        <div className="flex items-center gap-1.5">
          <Folder size={14} className="text-mv-green-dark" />
          <span className="text-[12px] font-semibold text-mv-ink">Dossiers RAG (Contexte)</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-mv-green-tint text-mv-green-dark font-medium">
          {activeDossiers.length} actifs
        </span>
      </div>

      <p className="text-[11px] text-mv-ink-faint leading-tight">
        Cochez les domaines injectés dans l&apos;intelligence de Flow AI pour cette session :
      </p>

      <div className="flex flex-col gap-1 mt-1">
        {DEFAULT_DOSSIERS.map((dossier) => {
          const isActive = activeDossiers.includes(dossier.slug);
          const isExpanded = expandedSlug === dossier.slug;

          return (
            <div
              key={dossier.slug}
              className={cn(
                "flex flex-col rounded-lg border transition-colors",
                isActive ? "bg-[#FAF8F2] border-mv-border" : "bg-white/50 border-transparent hover:border-mv-border-soft"
              )}
            >
              <div className="flex items-center justify-between p-2">
                <button
                  type="button"
                  onClick={() => toggleDossier(dossier.slug)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                  {isActive ? (
                    <CheckSquare size={14} className="text-mv-green shrink-0" />
                  ) : (
                    <Square size={14} className="text-mv-ink-faint shrink-0" />
                  )}
                  <span className="shrink-0">{ICONS_MAP[dossier.icon]}</span>
                  <span
                    className={cn(
                      "text-[12px] truncate",
                      isActive ? "font-medium text-mv-ink" : "text-mv-ink-soft"
                    )}
                  >
                    {dossier.name}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedSlug(isExpanded ? null : dossier.slug)}
                  className="p-1 text-mv-ink-faint hover:text-mv-ink"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>

              {isExpanded && (
                <div className="px-3 pb-2 pt-0.5 text-[11px] text-mv-ink-soft border-t border-mv-border-soft/60 bg-white/60">
                  <p>{dossier.description}</p>
                  <p className="text-[10px] text-mv-green-dark mt-1 font-medium">
                    ● Synchronisation automatique avec la base restaurant
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bouton d'ajout de SOP personnalisée ───────────────────────────────── */}
      <Dialog open={newSopOpen} onOpenChange={setNewSopOpen}>
        <DialogTrigger className="w-full mt-1 h-7 text-[11px] border border-dashed border-mv-border rounded-md text-mv-ink-soft hover:text-mv-green-dark hover:border-mv-green flex items-center justify-center gap-1 cursor-pointer">
          <Plus size={12} /> Ajouter une consigne / SOP
        </DialogTrigger>
        <DialogContent className="max-w-md bg-mv-surface border-mv-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-mv-ink">
              Ajouter une consigne ou SOP au restaurant
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-sm text-mv-ink">
            <div>
              <label className="text-[12px] font-medium text-mv-ink-soft block mb-1">
                Titre de la consigne (ex: Protocole ouverture terrasse)
              </label>
              <input
                type="text"
                value={sopTitle}
                onChange={(e) => setSopTitle(e.target.value)}
                placeholder="Ex: Nettoyage et calibrage machine à café"
                className="w-full px-3 py-2 rounded-lg border border-mv-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-mv-green"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-mv-ink-soft block mb-1">
                Description / Procédure opérationnelle
              </label>
              <textarea
                rows={5}
                value={sopContent}
                onChange={(e) => setSopContent(e.target.value)}
                placeholder="Détaillez les étapes à suivre pour les équipes..."
                className="w-full px-3 py-2 rounded-lg border border-mv-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-mv-green resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setNewSopOpen(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleAddSop}
                disabled={isSubmittingSop}
                className="bg-mv-green hover:bg-mv-green-dark text-white"
              >
                {isSubmittingSop ? "Enregistrement..." : "Enregistrer la consigne"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
