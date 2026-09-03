"use client";

import React, { useState } from "react";
import {
  Store,
  Plus,
  Sparkles,
  ArrowRight,
  Bot,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Flame,
  Zap,
} from "lucide-react";
import { FLOW_AI_SPECIALISTS, FlowAiSpecialist } from "@/lib/ai/specialists";
import { createConversationAction } from "@/app/[locale]/(chat)/assistant/actions";
import {
  executeCreateCustomAgentAction,
  executeDeleteCustomAgentAction,
  executeUpdateAgentAction,
} from "@/app/[locale]/(chat)/assistant/flow-ai-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlowAiHeaderNav } from "@/components/chat/FlowAiHeaderNav";
import type { RestaurantCustomAgent } from "@/lib/types";

export function AgentsStoreView({
  restaurantId,
  restaurantName,
  customAgents = [],
}: {
  restaurantId: string;
  restaurantName?: string;
  customAgents?: RestaurantCustomAgent[];
}) {
  const router = useRouter();
  const [createModalOpen, setNewModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [agentAvatar, setAgentAvatar] = useState("👨‍🍳");
  const [agentDescription, setAgentDescription] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentTone, setAgentTone] = useState("expert_chaleureux");

  async function handleStartChat(agentId: string) {
    try {
      const conv = await createConversationAction(restaurantId);
      if (conv) {
        await executeUpdateAgentAction(conv.id, agentId);
        router.push(`/assistant/${conv.id}`);
      }
    } catch {
      toast.error("Erreur lors de la création de la session");
    }
  }

  async function handleCreateAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!agentName.trim() || !agentPrompt.trim()) {
      toast.error("Veuillez renseigner le nom et les instructions de l'agent.");
      return;
    }

    setIsCreating(true);
    const res = await executeCreateCustomAgentAction({
      restaurantId,
      name: agentName,
      role: agentRole || "Consultant Restauration",
      avatar: agentAvatar,
      description: agentDescription,
      systemPrompt: agentPrompt,
      tone: agentTone,
      skills: ["menu", "operations"],
    });

    setIsCreating(false);
    if (res.success) {
      toast.success(`Agent « ${agentName} » créé avec succès !`);
      setNewModalOpen(false);
      setAgentName("");
      setAgentRole("");
      setAgentDescription("");
      setAgentPrompt("");
      router.refresh();
    } else {
      toast.error(res.error ?? "Erreur de création");
    }
  }

  async function handleDeleteCustomAgent(id: string) {
    const res = await executeDeleteCustomAgentAction(id);
    if (res.success) {
      toast.success("Agent supprimé");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF8F5] overflow-y-auto">
      <FlowAiHeaderNav restaurantName={restaurantName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* ── En-tête Héroïque Éditorial ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-mv-border">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-mv-green-tint text-mv-green-dark border border-mv-green/20">
                Minerva Flow AI Studio
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-mv-ink tracking-tight">
              Agents Store &amp; Spécialistes Métier
            </h1>
            <p className="text-mv-ink-soft text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Activez des agents spécialisés calibrés sur vos vraies données restaurant (Food Cost, Prime Cost,
              Fidélisation LTV et Opérations) ou créez vos propres assistants sur-mesure.
            </p>
          </div>

          <Dialog open={createModalOpen} onOpenChange={setNewModalOpen}>
            <DialogTrigger className="bg-mv-green hover:bg-mv-green-dark text-white font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-xs shrink-0 cursor-pointer text-sm">
              <Plus size={16} /> Créer un Spécialiste
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-mv-surface border-mv-border">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-mv-ink">
                  Créer un Spécialiste Restaurant Sur-Mesure
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAgent} className="flex flex-col gap-4 py-2">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <label className="text-[12px] font-medium text-mv-ink-soft block mb-1">Avatar</label>
                    <input
                      type="text"
                      value={agentAvatar}
                      onChange={(e) => setAgentAvatar(e.target.value)}
                      maxLength={2}
                      className="w-full text-center text-2xl py-2 rounded-lg border border-mv-border bg-white focus:outline-none focus:ring-1 focus:ring-mv-green"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[12px] font-medium text-mv-ink-soft block mb-1">Nom de l&apos;Agent</label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Ex: Bar Manager & Sommelier"
                      className="w-full px-3 py-2 rounded-lg border border-mv-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-mv-green"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-mv-ink-soft block mb-1">Rôle Métier</label>
                  <input
                    type="text"
                    value={agentRole}
                    onChange={(e) => setAgentRole(e.target.value)}
                    placeholder="Ex: Optimisation de la carte des vins et cocktails"
                    className="w-full px-3 py-2 rounded-lg border border-mv-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-mv-green"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-mv-ink-soft block mb-1">Description courte</label>
                  <input
                    type="text"
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    placeholder="Ex: Analyse les ratios boissons et le taux de marge des apéritifs"
                    className="w-full px-3 py-2 rounded-lg border border-mv-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-mv-green"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-mv-ink-soft block mb-1">
                    Instructions Système &amp; Directives (System Prompt)
                  </label>
                  <textarea
                    rows={4}
                    value={agentPrompt}
                    onChange={(e) => setAgentPrompt(e.target.value)}
                    placeholder="Tu es le sommelier en chef. Calcule le ratio de marge des bouteilles..."
                    className="w-full px-3 py-2 rounded-lg border border-mv-border bg-white text-sm focus:outline-none focus:ring-1 focus:ring-mv-green resize-none font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" type="button" onClick={() => setNewModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isCreating} className="bg-mv-green hover:bg-mv-green-dark text-white">
                    {isCreating ? "Création..." : "Enregistrer et activer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Spécialistes Officiels Préconfigurés ──────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-mv-green-dark" />
            <h2 className="font-serif text-xl font-bold text-mv-ink">Spécialistes Certifiés Minerva Flow</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FLOW_AI_SPECIALISTS.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between p-5 rounded-2xl border border-mv-border bg-mv-surface hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 rounded-xl bg-mv-cream border border-mv-border-soft">
                        {s.avatar}
                      </span>
                      <div>
                        <h3 className="font-serif font-bold text-lg text-mv-ink group-hover:text-mv-green-dark transition-colors">
                          {s.name}
                        </h3>
                        <p className="text-[12px] text-mv-ink-soft font-medium">{s.role}</p>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-mv-green-tint text-mv-green-dark font-medium border border-mv-green/20 shrink-0">
                      {s.badge}
                    </span>
                  </div>

                  <p className="text-sm text-mv-ink-soft mt-3.5 leading-relaxed">{s.description}</p>

                  {/* Métriques Clés Focus */}
                  <div className="mt-4 pt-3 border-t border-mv-border-soft flex flex-wrap gap-1.5">
                    {s.focusMetrics.map((metric, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-[#FAF7F0] border border-mv-border-soft text-mv-ink-soft font-mono"
                      >
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-mv-border-soft flex items-center justify-between">
                  <span className="text-[11px] text-mv-green-dark font-medium flex items-center gap-1">
                    <CheckCircle2 size={13} /> Modèle Gemini 3.7 Flash optimisé
                  </span>
                  <Button
                    onClick={() => handleStartChat(s.id)}
                    className="bg-mv-green hover:bg-mv-green-dark text-white text-[12px] font-semibold rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Consulter</span>
                    <ArrowRight size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Agents Personnalisés du Restaurant ───────────────────────────────── */}
        {customAgents.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-mv-amber" />
              <h2 className="font-serif text-xl font-bold text-mv-ink">Vos Spécialistes Sur-Mesure</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {customAgents.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col justify-between p-5 rounded-2xl border border-mv-border bg-mv-surface hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-xl bg-mv-cream border border-mv-border-soft">
                          {a.avatar}
                        </span>
                        <div>
                          <h3 className="font-serif font-bold text-lg text-mv-ink">{a.name}</h3>
                          <p className="text-[12px] text-mv-ink-soft font-medium">{a.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCustomAgent(a.id)}
                        title="Supprimer l'agent"
                        className="p-1.5 text-mv-ink-faint hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <p className="text-sm text-mv-ink-soft mt-3.5 leading-relaxed">
                      {a.description || "Assistant personnalisé d'exploitation."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-mv-border-soft flex items-center justify-between">
                    <span className="text-[11px] text-mv-ink-faint">Créé par l&apos;établissement</span>
                    <Button
                      onClick={() => handleStartChat(a.id)}
                      className="bg-mv-green hover:bg-mv-green-dark text-white text-[12px] font-semibold rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>Consulter</span>
                      <ArrowRight size={13} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
