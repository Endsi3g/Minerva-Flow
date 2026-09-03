"use client";

import React, { useState } from "react";
import {
  Zap,
  Play,
  Check,
  UtensilsCrossed,
  PieChart,
  Send,
  DollarSign,
  CheckSquare,
  FileSpreadsheet,
  FolderSearch,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { FLOW_AI_SKILLS, FlowAiSkill } from "@/lib/ai/skills";
import { FlowAiHeaderNav } from "@/components/chat/FlowAiHeaderNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SKILL_ICONS: Record<string, React.ReactNode> = {
  UtensilsCrossed: <UtensilsCrossed size={18} className="text-mv-green" />,
  PieChart: <PieChart size={18} className="text-mv-amber" />,
  Send: <Send size={18} className="text-blue-600" />,
  DollarSign: <DollarSign size={18} className="text-emerald-700" />,
  CheckSquare: <CheckSquare size={18} className="text-purple-600" />,
  FileSpreadsheet: <FileSpreadsheet size={18} className="text-teal-700" />,
  FolderSearch: <FolderSearch size={18} className="text-amber-800" />,
};

export function SkillsRegistryView({
  restaurantName,
}: {
  restaurantName?: string;
}) {
  const [selectedSkill, setSelectedSkill] = useState<FlowAiSkill | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "Toutes les capacités" },
    { id: "menu", label: "Menu & Recettes" },
    { id: "finance", label: "Finances & Marges" },
    { id: "loyalty", label: "Fidélisation & Cohortes" },
    { id: "operations", label: "Opérations & Équipe" },
  ];

  const filteredSkills =
    activeCategory === "all"
      ? FLOW_AI_SKILLS
      : FLOW_AI_SKILLS.filter((s) => s.category === activeCategory);

  function handleOpenTester(skill: FlowAiSkill) {
    setSelectedSkill(skill);
    setTestResult(null);
  }

  function handleRunSimulation() {
    if (!selectedSkill) return;
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setTestResult(selectedSkill.sampleOutput);
      toast.success("Capacité exécutée avec succès !");
    }, 600);
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#FAF8F5] overflow-y-auto">
      <FlowAiHeaderNav restaurantName={restaurantName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* ── En-tête Héroïque ──────────────────────────────────────────────────── */}
        <div className="pb-8 border-b border-mv-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-mv-lime/40 text-mv-lime-dark border border-mv-lime-dark/20">
              Moteur Agentique Autonome
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-mv-ink tracking-tight">
            Registre des Capacités (Skills)
          </h1>
          <p className="text-mv-ink-soft text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
            Consultez et testez les outils d&apos;action opérationnelle que Flow AI utilise en arrière-plan pour
            ajuster vos prix, calculer le Prime Cost, relancer vos clients et gérer vos équipes.
          </p>
        </div>

        {/* ── Filtres par Catégorie ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-6 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0",
                activeCategory === cat.id
                  ? "bg-mv-green text-white font-semibold shadow-xs"
                  : "bg-mv-surface text-mv-ink-soft hover:text-mv-ink border border-mv-border"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Grille des Compétences ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className="flex flex-col justify-between p-5 rounded-2xl border border-mv-border bg-mv-surface hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-mv-cream border border-mv-border-soft">
                    {SKILL_ICONS[skill.icon]}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-[#FAF7F0] border border-mv-border-soft text-mv-ink-soft">
                    {skill.badge}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-base text-mv-ink mt-3 group-hover:text-mv-green-dark transition-colors">
                  {skill.name}
                </h3>
                <span className="text-[11px] text-mv-green-dark font-medium block mt-0.5">
                  {skill.categoryLabel}
                </span>

                <p className="text-[12.5px] text-mv-ink-soft mt-2 leading-relaxed">{skill.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-mv-border-soft flex items-center justify-between">
                <span className="text-[11px] text-mv-ink-faint font-mono">
                  {skill.inputs.length} paramètre{skill.inputs.length > 1 ? "s" : ""}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenTester(skill)}
                  className="border-mv-border hover:bg-mv-cream text-mv-ink text-[11.5px] font-medium rounded-lg h-7 px-2.5 flex items-center gap-1.5"
                >
                  <Play size={11} className="text-mv-green fill-mv-green" /> Tester
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Modale de Test Interactif ────────────────────────────────────────── */}
        <Dialog open={Boolean(selectedSkill)} onOpenChange={(open) => !open && setSelectedSkill(null)}>
          <DialogContent className="max-w-md bg-mv-surface border-mv-border">
            {selectedSkill && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 rounded-lg bg-mv-cream border border-mv-border-soft">
                      {SKILL_ICONS[selectedSkill.icon]}
                    </span>
                    <DialogTitle className="font-serif text-xl text-mv-ink">{selectedSkill.name}</DialogTitle>
                  </div>
                </DialogHeader>

                <div className="flex flex-col gap-3 py-2 text-sm text-mv-ink">
                  <p className="text-[13px] text-mv-ink-soft">{selectedSkill.description}</p>

                  <div className="bg-[#FAF8F2] p-3 rounded-xl border border-mv-border-soft">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-mv-ink-faint block mb-2">
                      Paramètres d&apos;entrée requis
                    </span>
                    <div className="space-y-2">
                      {selectedSkill.inputs.map((inp, idx) => (
                        <div key={idx}>
                          <label className="text-[11.5px] text-mv-ink font-medium block">
                            {inp.name} {inp.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            placeholder={inp.placeholder}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-mv-border bg-white text-xs mt-0.5 focus:outline-none focus:ring-1 focus:ring-mv-green"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {testResult && (
                    <div className="p-3 rounded-xl bg-mv-green-tint/40 border border-mv-green/30 text-xs text-mv-ink">
                      <span className="font-bold text-mv-green-dark block mb-1 flex items-center gap-1">
                        <Check size={13} /> Résultat de la simulation :
                      </span>
                      <p className="leading-relaxed font-sans">{testResult}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSkill(null)}>
                      Fermer
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRunSimulation}
                      disabled={isExecuting}
                      className="bg-mv-green hover:bg-mv-green-dark text-white font-medium flex items-center gap-1.5"
                    >
                      <Play size={12} className="fill-white" />
                      {isExecuting ? "Simulation..." : "Lancer le test"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
