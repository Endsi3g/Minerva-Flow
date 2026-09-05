"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Brain,
  Store,
  Plus,
  ArrowRight,
  Bot,
  Trash2,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Settings,
  LogOut,
  TrendingUp,
  HeartHandshake,
  ClipboardList,
  Sparkles,
  Users2,
} from "lucide-react";
import { FLOW_AI_SPECIALISTS, type FlowAiSpecialist } from "@/lib/ai/specialists";
import { createConversationAction } from "@/app/[locale]/(chat)/assistant/actions";
import {
  executeCreateCustomAgentAction,
  executeDeleteCustomAgentAction,
  executeUpdateAgentAction,
} from "@/app/[locale]/(chat)/assistant/flow-ai-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RestaurantCustomAgent } from "@/lib/types";

type AgentCategory = {
  slug: string;
  label: string;
  chipClass: string;
};

const CATEGORY_COPILOTE: AgentCategory = {
  slug: "copilote",
  label: "Copilote Général",
  chipClass: "bg-neutral-100 text-neutral-700 border-neutral-200",
};
const CATEGORY_RENTABILITE: AgentCategory = {
  slug: "rentabilite",
  label: "Rentabilité & Carte",
  chipClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
};
const CATEGORY_FIDELISATION: AgentCategory = {
  slug: "fidelisation",
  label: "Fidélisation & Croissance",
  chipClass: "bg-amber-50 text-amber-800 border-amber-200",
};
const CATEGORY_OPERATIONS: AgentCategory = {
  slug: "operations",
  label: "Opérations & Service",
  chipClass: "bg-blue-50 text-blue-800 border-blue-200",
};
const CATEGORY_SUR_MESURE: AgentCategory = {
  slug: "sur-mesure",
  label: "Sur-Mesure",
  chipClass: "bg-violet-50 text-violet-800 border-violet-200",
};

const ALL_CATEGORIES = [
  CATEGORY_COPILOTE,
  CATEGORY_RENTABILITE,
  CATEGORY_FIDELISATION,
  CATEGORY_OPERATIONS,
  CATEGORY_SUR_MESURE,
];

function categoryForSpecialist(id: string): AgentCategory {
  switch (id) {
    case "menu-engineer":
    case "prime-cost-auditor":
      return CATEGORY_RENTABILITE;
    case "retention-strategist":
      return CATEGORY_FIDELISATION;
    case "service-coach":
      return CATEGORY_OPERATIONS;
    default:
      return CATEGORY_COPILOTE;
  }
}

const TEAM_GROUPS: {
  category: AgentCategory;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  specialistIds: string[];
}[] = [
  {
    category: CATEGORY_RENTABILITE,
    icon: TrendingUp,
    description: "Food Cost, Prime Cost et rentabilité de la carte.",
    specialistIds: ["menu-engineer", "prime-cost-auditor"],
  },
  {
    category: CATEGORY_FIDELISATION,
    icon: HeartHandshake,
    description: "Rétention, LTV et relances clients ciblées.",
    specialistIds: ["retention-strategist"],
  },
  {
    category: CATEGORY_OPERATIONS,
    icon: ClipboardList,
    description: "Briefings d'équipe, service et standards de salle.",
    specialistIds: ["service-coach"],
  },
];

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
  const pathname = usePathname();
  const [createModalOpen, setNewModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Form state
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [agentAvatar, setAgentAvatar] = useState("👨‍🍳");
  const [agentDescription, setAgentDescription] = useState("");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentTone, setAgentTone] = useState("expert_chaleureux");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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

  const allAgents = useMemo(() => {
    const specialists = FLOW_AI_SPECIALISTS.map((s) => ({
      kind: "specialist" as const,
      id: s.id,
      name: s.name,
      role: s.role,
      avatar: s.avatar,
      description: s.description,
      category: categoryForSpecialist(s.id),
      specialist: s,
    }));
    const custom = customAgents.map((a) => ({
      kind: "custom" as const,
      id: a.id,
      name: a.name,
      role: a.role,
      avatar: a.avatar,
      description: a.description || "Assistant personnalisé d'exploitation.",
      category: CATEGORY_SUR_MESURE,
      specialist: null as FlowAiSpecialist | null,
    }));
    return [...specialists, ...custom];
  }, [customAgents]);

  const filteredAgents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allAgents.filter((a) => {
      const matchesCategory = !activeCategory || a.category.slug === activeCategory;
      const matchesQuery =
        !q || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [allAgents, searchQuery, activeCategory]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#26251e] font-sans">
      {/* ── RAIL DE NAVIGATION GAUCHE ──────────────────────────────────────────── */}
      <aside className="w-[240px] shrink-0 border-r border-[#e5e5e0] bg-[#f4f4f3] flex flex-col h-full select-none">
        <div className="flex h-12 items-center justify-between border-b border-[#e5e5e0] px-4">
          <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-[#26251e] min-w-0">
            <div className="h-5 w-5 rounded-md bg-[#059669] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Sparkles className="h-3 w-3" />
            </div>
            <span className="truncate">Minerva Flow</span>
            <span className="text-[9px] font-bold text-[#059669] bg-[#059669]/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              AI
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <Link
            href="/overview"
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] hover:text-[#059669] px-2 py-1.5 rounded-md hover:bg-[#e5e5e2]/60 transition-colors mb-2"
          >
            <span>Minerva Flow</span>
          </Link>

          <Link
            href="/assistant"
            className={cn(
              "flex items-center gap-2.5 text-xs font-semibold px-2.5 py-2 rounded-md transition-colors",
              pathname.endsWith("/assistant")
                ? "bg-white text-[#26251e] shadow-xs border border-[#e5e5e0]"
                : "text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60"
            )}
          >
            <Brain className="h-4 w-4 text-[#059669] shrink-0" strokeWidth={2} />
            <span>Assistant</span>
          </Link>

          <Link
            href="/assistant/agents"
            className={cn(
              "flex items-center gap-2.5 text-xs font-semibold px-2.5 py-2 rounded-md transition-colors",
              pathname.includes("/assistant/agents")
                ? "bg-white text-[#26251e] shadow-xs border border-[#e5e5e0]"
                : "text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60"
            )}
          >
            <Store className="h-4 w-4 text-[#059669] shrink-0" strokeWidth={2} />
            <span>Agents Store</span>
          </Link>
        </nav>

        <div className="border-t border-[#e5e5e0] px-3 py-2.5 space-y-0.5">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 text-xs font-semibold px-2 py-1.5 rounded-md text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
          >
            <Settings className="h-4 w-4 text-[#7a7a76]" />
            <span>Paramètres</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 text-xs font-semibold px-2 py-1.5 rounded-md text-[#555552] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-[#7a7a76]" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── CONTENU PRINCIPAL ───────────────────────────────────────────────────── */}
      <main className="flex-1 h-full overflow-y-auto bg-[#FAF8F5]">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
          {/* En-tête */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#26251e] tracking-tight">
                Agents
              </h1>
              <p className="text-[#7a7a76] text-sm sm:text-base mt-1.5 max-w-2xl leading-relaxed">
                Assistants IA spécialisés pour l&apos;exploitation de {restaurantName || "votre établissement"}.
              </p>
            </div>

            <Dialog open={createModalOpen} onOpenChange={setNewModalOpen}>
              <DialogTrigger className="bg-[#059669] hover:bg-[#047857] text-white font-semibold rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-xs shrink-0 cursor-pointer text-sm">
                <Plus size={16} /> Créer un agent
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-white">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl text-[#26251e]">
                    Créer un Spécialiste Restaurant Sur-Mesure
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateAgent} className="flex flex-col gap-4 py-2">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className="text-[12px] font-medium text-[#7a7a76] block mb-1">Avatar</label>
                      <input
                        type="text"
                        value={agentAvatar}
                        onChange={(e) => setAgentAvatar(e.target.value)}
                        maxLength={2}
                        className="w-full text-center text-2xl py-2 rounded-lg border border-[#e0e0dc] bg-white focus:outline-none focus:ring-1 focus:ring-[#059669]"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[12px] font-medium text-[#7a7a76] block mb-1">Nom de l&apos;Agent</label>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="Ex: Bar Manager & Sommelier"
                        className="w-full px-3 py-2 rounded-lg border border-[#e0e0dc] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#059669]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#7a7a76] block mb-1">Rôle Métier</label>
                    <input
                      type="text"
                      value={agentRole}
                      onChange={(e) => setAgentRole(e.target.value)}
                      placeholder="Ex: Optimisation de la carte des vins et cocktails"
                      className="w-full px-3 py-2 rounded-lg border border-[#e0e0dc] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#7a7a76] block mb-1">Description courte</label>
                    <input
                      type="text"
                      value={agentDescription}
                      onChange={(e) => setAgentDescription(e.target.value)}
                      placeholder="Ex: Analyse les ratios boissons et le taux de marge des apéritifs"
                      className="w-full px-3 py-2 rounded-lg border border-[#e0e0dc] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#7a7a76] block mb-1">
                      Instructions Système &amp; Directives (System Prompt)
                    </label>
                    <textarea
                      rows={4}
                      value={agentPrompt}
                      onChange={(e) => setAgentPrompt(e.target.value)}
                      placeholder="Tu es le sommelier en chef. Calcule le ratio de marge des bouteilles..."
                      className="w-full px-3 py-2 rounded-lg border border-[#e0e0dc] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#059669] resize-none font-sans"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" type="button" onClick={() => setNewModalOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={isCreating} className="bg-[#059669] hover:bg-[#047857] text-white">
                      {isCreating ? "Création..." : "Enregistrer et activer"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filtres & Recherche */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mt-6">
            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="h-9 px-3.5 rounded-lg border border-[#e0e0dc] bg-white hover:bg-neutral-50 flex items-center gap-2 text-xs font-semibold text-[#26251e] transition-colors cursor-pointer"
              >
                <SlidersHorizontal size={13} />
                <span>Filtres</span>
                <ChevronDown size={13} className="text-neutral-400" />
              </button>

              {filtersOpen && (
                <div className="absolute left-0 top-10 z-30 bg-white border border-[#e6e5e0] rounded-xl py-1.5 shadow-lg w-56 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory(null);
                      setFiltersOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[12px] font-semibold hover:bg-neutral-50 transition-colors cursor-pointer",
                      activeCategory === null ? "text-[#059669]" : "text-[#26251e]"
                    )}
                  >
                    Toutes les catégories
                  </button>
                  {ALL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat.slug);
                        setFiltersOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-[12px] font-semibold hover:bg-neutral-50 transition-colors cursor-pointer",
                        activeCategory === cat.slug ? "text-[#059669]" : "text-[#26251e]"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un agent..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#e0e0dc] bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#059669]"
              />
            </div>
          </div>

          {/* Bannière Sur-Mesure */}
          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[#e6e5e0] bg-white px-5 py-4">
            <div>
              <p className="text-sm font-bold text-[#26251e]">Vos agents sont privés à cet établissement</p>
              <p className="text-[12.5px] text-[#7a7a76] mt-0.5">
                Créez autant de spécialistes sur-mesure que nécessaire — ils restent réservés à votre équipe.
              </p>
            </div>
            <Button
              onClick={() => setNewModalOpen(true)}
              className="bg-white border border-[#e0e0dc] hover:bg-neutral-50 text-[#26251e] text-xs font-semibold shrink-0"
            >
              Créer un agent
            </Button>
          </div>

          {/* Équipe d'agents Minerva Flow */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Users2 size={15} className="text-[#7a7a76]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                Équipe d&apos;agents Minerva — 7 derniers jours
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEAM_GROUPS.map((group) => {
                const Icon = group.icon;
                const members = FLOW_AI_SPECIALISTS.filter((s) => group.specialistIds.includes(s.id));
                return (
                  <div
                    key={group.category.slug}
                    className="rounded-2xl border border-[#e6e5e0] bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-serif font-bold text-[15px] text-[#26251e]">
                        <Icon size={15} className="text-[#059669]" />
                        {group.category.label}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                        0 ACTIONS
                      </span>
                    </div>
                    <p className="text-[12px] text-[#7a7a76] mt-2 leading-relaxed">{group.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-[#7a7a76]">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-neutral-400" />0 exécutées
                      </span>
                      <span>0 conversations lancées</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {members.map((m) => (
                        <span
                          key={m.id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF7F0] border border-[#e6e5e0] text-[#555552] font-medium"
                        >
                          {m.avatar} {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tous les agents */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-[#059669]" />
                <h2 className="font-serif text-xl font-bold text-[#26251e]">
                  Tous les agents <span className="text-[#7a7a76] font-sans text-sm font-medium">| {filteredAgents.length} agents</span>
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-[#7a7a76] flex items-center gap-1">
                Les plus populaires <ChevronDown size={13} />
              </span>
            </div>

            {filteredAgents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#e0e0dc] bg-white/60 py-10 text-center text-sm text-[#7a7a76]">
                Aucun agent ne correspond à votre recherche.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredAgents.map((a) => (
                  <div
                    key={`${a.kind}-${a.id}`}
                    className="flex flex-col justify-between p-5 rounded-2xl border border-[#e6e5e0] bg-white hover:shadow-md transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl p-2 rounded-xl bg-[#FAF7F0] border border-[#e6e5e0]">
                            {a.avatar}
                          </span>
                          <div>
                            <h3 className="font-serif font-bold text-lg text-[#26251e] group-hover:text-[#047857] transition-colors">
                              {a.name}
                            </h3>
                            <p className="text-[12px] text-[#7a7a76] font-medium">{a.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={cn(
                              "text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border",
                              a.category.chipClass
                            )}
                          >
                            {a.category.label}
                          </span>
                          {a.kind === "custom" && (
                            <button
                              onClick={() => handleDeleteCustomAgent(a.id)}
                              title="Supprimer l'agent"
                              className="p-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-[#7a7a76] mt-3.5 leading-relaxed">{a.description}</p>

                      {a.specialist && (
                        <div className="mt-4 pt-3 border-t border-[#f0efea] flex flex-wrap gap-1.5">
                          {a.specialist.focusMetrics.map((metric, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-[#FAF7F0] border border-[#e6e5e0] text-[#7a7a76] font-mono"
                            >
                              {metric}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#f0efea] flex items-center justify-between">
                      <span className="text-[11px] text-[#059669] font-medium flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        {a.kind === "custom" ? "Créé par l'établissement" : "Modèle Gemini 3.7 Flash optimisé"}
                      </span>
                      <Button
                        onClick={() => handleStartChat(a.id)}
                        className="bg-[#059669] hover:bg-[#047857] text-white text-[12px] font-semibold rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>Consulter</span>
                        <ArrowRight size={13} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
