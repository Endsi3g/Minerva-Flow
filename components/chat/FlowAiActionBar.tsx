"use client";

import React, { useState } from "react";
import {
  UtensilsCrossed,
  Send,
  CheckSquare,
  FileText,
  Check,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  executeMenuItemUpdateAction,
  executeLoyaltyCampaignAction,
  executeStaffTaskAction,
} from "@/app/[locale]/(chat)/assistant/flow-ai-actions";
import { type FlowAiActionPayload, extractMinervaActions } from "@/lib/ai/actions";

export type { FlowAiActionPayload };
export { extractMinervaActions };

export function FlowAiActionCard({
  restaurantId,
  payload,
}: {
  restaurantId: string;
  payload: FlowAiActionPayload;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleExecute = async () => {
    setStatus("loading");
    try {
      if (payload.type === "menu") {
        const res = await executeMenuItemUpdateAction({
          restaurantId,
          itemId: payload.itemId,
          price: payload.price,
          active: payload.active,
        });
        if (res.success) {
          setStatus("success");
          setResultMessage(res.message ?? "Succès");
          if (res.message) toast.success(res.message);
        } else {
          setStatus("error");
          setResultMessage(res.error ?? "Échec");
          toast.error(res.error ?? "Erreur");
        }
      } else if (payload.type === "campaign") {
        const res = await executeLoyaltyCampaignAction({
          restaurantId,
          name: payload.name,
          description: payload.description,
          channel: payload.channel,
          estimatedRevenue: payload.estimatedRevenue,
        });
        if (res.success) {
          setStatus("success");
          setResultMessage(res.message ?? "Succès");
          if (res.message) toast.success(res.message);
        } else {
          setStatus("error");
          setResultMessage(res.error ?? "Échec");
          toast.error(res.error ?? "Erreur");
        }
      } else if (payload.type === "task") {
        const res = await executeStaffTaskAction({
          restaurantId,
          employeeName: payload.employeeName,
          title: payload.taskTitle,
          description: payload.description,
        });
        if (res.success) {
          setStatus("success");
          setResultMessage(res.message ?? "Succès");
          if (res.message) toast.success(res.message);
        } else {
          setStatus("error");
          setResultMessage(res.error ?? "Échec");
          toast.error(res.error ?? "Erreur");
        }
      } else if (payload.type === "canvas") {
        const customEvent = new CustomEvent("minerva_insert_canvas", {
          detail: {
            title: payload.title,
            content: payload.content,
          },
        });
        window.dispatchEvent(customEvent);
        setStatus("success");
        setResultMessage("Contenu transféré dans le Canvas latéral.");
        toast.success("Contenu inséré dans le Canvas !");
      }
    } catch (err: unknown) {
      setStatus("error");
      const message = err instanceof Error ? err.message : "Erreur inattendue";
      setResultMessage(message);
      toast.error(message);
    }
  };

  return (
    <div className="my-3 p-3.5 rounded-xl border border-mv-border bg-[#FDFBF7] shadow-xs flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {payload.type === "menu" && <UtensilsCrossed size={16} className="text-mv-green" />}
          {payload.type === "campaign" && <Send size={16} className="text-blue-600" />}
          {payload.type === "task" && <CheckSquare size={16} className="text-purple-600" />}
          {payload.type === "canvas" && <FileText size={16} className="text-emerald-700" />}

          <span className="text-[13px] font-semibold text-mv-ink">
            {payload.type === "menu" && "Action Menu : " + payload.name}
            {payload.type === "campaign" && "Campagne Fidélité : " + payload.name}
            {payload.type === "task" && "Tâche d'Équipe : " + (payload.employeeName ?? "Équipe")}
            {payload.type === "canvas" && "Insertion Canvas : " + payload.title}
          </span>
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-mv-lime/30 text-mv-lime-dark">
          Action 1-Clic
        </span>
      </div>

      {/* Détails de l'action */}
      <div className="text-[12px] text-mv-ink-soft bg-white/70 p-2.5 rounded-lg border border-mv-border-soft flex flex-col gap-1">
        {payload.type === "menu" && (
          <>
            {payload.price !== undefined && (
              <p>
                • Nouveau prix suggéré : <strong>{payload.price.toFixed(2)} $</strong>
              </p>
            )}
            {payload.active !== undefined && (
              <p>
                • Statut : <strong>{payload.active ? "Disponible" : "Épuisé (Rupture)"}</strong>
              </p>
            )}
            {payload.reason && <p className="italic text-mv-ink-faint">« {payload.reason} »</p>}
          </>
        )}

        {payload.type === "campaign" && (
          <>
            <p>• Canal : {payload.channel ?? "Email"} · Type : Relance LTV</p>
            {payload.estimatedRevenue && (
              <p>
                • Chiffre d&apos;affaires incrémental estimé : <strong>+ {payload.estimatedRevenue} $</strong>
              </p>
            )}
            {payload.description && <p className="text-mv-ink-faint">{payload.description}</p>}
          </>
        )}

        {payload.type === "task" && (
          <>
            <p>
              • Tâche : <strong>{payload.taskTitle}</strong>
            </p>
            {payload.description && <p className="text-mv-ink-faint">{payload.description}</p>}
          </>
        )}

        {payload.type === "canvas" && (
          <p className="line-clamp-2 text-mv-ink-faint">{payload.content.replace(/<[^>]*>?/gm, "")}</p>
        )}
      </div>

      {/* Bouton d'action */}
      <div className="flex items-center justify-between pt-1">
        {status === "success" ? (
          <div className="flex items-center gap-1.5 text-[12px] text-mv-green-dark font-medium">
            <Check size={14} className="text-mv-green" />
            <span>{resultMessage ?? "Action appliquée avec succès"}</span>
          </div>
        ) : status === "error" ? (
          <div className="flex items-center gap-1.5 text-[12px] text-red-600 font-medium">
            <AlertCircle size={14} />
            <span>{resultMessage ?? "Erreur d'application"}</span>
          </div>
        ) : (
          <div className="text-[11px] text-mv-ink-faint flex items-center gap-1">
            <Sparkles size={11} className="text-mv-amber" />
            Validation en 1 clic
          </div>
        )}

        {status !== "success" && (
          <Button
            size="sm"
            onClick={handleExecute}
            disabled={status === "loading"}
            className="h-8 px-3 bg-mv-green hover:bg-mv-green-dark text-white text-[12px] font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            {status === "loading" ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Application...
              </>
            ) : payload.type === "canvas" ? (
              <>
                <FileText size={13} /> Insérer dans le Canvas
              </>
            ) : (
              <>
                <Check size={13} /> Approuver et appliquer
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

