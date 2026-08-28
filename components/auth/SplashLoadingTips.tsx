"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import { LogoMark } from "@/components/shell/Logo";

interface Tip {
  id: number;
  title: string;
  desc: string;
  tag: string;
}

const TIPS: Tip[] = [
  {
    id: 1,
    tag: "Synchronisation Caisse",
    title: "Connexion temps réel",
    desc: "Connectez votre caisse (Lightspeed, Square, Stripe) pour synchroniser vos ventes sans aucune saisie manuelle.",
  },
  {
    id: 2,
    tag: "Food-Cost & Marges",
    title: "Calcul automatique des marges",
    desc: "Déposez une facture fournisseur ou un export de stock : Flow calcule vos food-costs et marges brutes en temps réel.",
  },
  {
    id: 3,
    tag: "Copilote IA d'Exploitation",
    title: "Prévisions & Recommandations",
    desc: "Posez vos questions en langage naturel au Copilote IA pour obtenir des prévisions de staffing et optimiser vos prix.",
  },
];

const DURATION_PER_TIP_MS = 2800;

export function SplashLoadingTips({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const intervalMs = 40;
    const step = (intervalMs / DURATION_PER_TIP_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          if (currentTipIndex < TIPS.length - 1) {
            setCurrentTipIndex((idx) => idx + 1);
            return 0;
          } else {
            clearInterval(timer);
            setTimeout(onComplete, 300);
            return 100;
          }
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentTipIndex, onComplete]);

  const currentTip = TIPS[currentTipIndex] || TIPS[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF8F5]/95 backdrop-blur-md text-[#1F1E1D] animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white border border-[#E2E0D8] rounded-3xl p-7 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] text-center space-y-6">
        
        {/* Animated Brand Logo */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-2 rounded-3xl bg-[#0E7C5A]/10 animate-ping" />
            <div className="relative p-2.5 rounded-2xl bg-white border border-[#E2E0D8] shadow-sm">
              <LogoMark size={44} />
            </div>
          </div>
          <div>
            <h2 className="font-sans font-bold text-xl text-[#0A3F2F] tracking-tight">
              Minerva Flow
            </h2>
            <p className="text-xs text-[#8A887F] font-medium mt-0.5">
              Initialisation de votre espace d&apos;exploitation...
            </p>
          </div>
        </div>

        {/* 3 Step Progress Bars */}
        <div className="grid grid-cols-3 gap-2">
          {TIPS.map((tip, idx) => {
            const isFinished = idx < currentTipIndex;
            const isCurrent = idx === currentTipIndex;
            return (
              <div key={tip.id} className="h-1.5 rounded-full bg-gray-100 overflow-hidden relative">
                <div
                  className="h-full bg-[#0E7C5A] transition-all duration-75"
                  style={{
                    width: isFinished ? "100%" : isCurrent ? `${progress}%` : "0%",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Dynamic Tip Card */}
        <div className="bg-[#FAF8F5] border border-[#E8E5DF] rounded-2xl p-5 text-left space-y-2 min-h-[140px] flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#0E7C5A] bg-[#0E7C5A]/10 border border-[#0E7C5A]/20 px-2 py-0.5 rounded-full">
                <Lightbulb size={11} />
                <span>Conseil {currentTipIndex + 1}/3 · {currentTip.tag}</span>
              </span>
              <span className="text-[11px] font-mono text-[#8A887F]">
                {Math.round(progress)}%
              </span>
            </div>
            <h3 className="font-sans font-bold text-sm text-[#1F1E1D]">
              {currentTip.title}
            </h3>
            <p className="text-xs text-[#6A6860] leading-relaxed mt-1">
              {currentTip.desc}
            </p>
          </div>
        </div>

        {/* Skip / Continue Button */}
        <button
          type="button"
          onClick={onComplete}
          className="w-full h-10 rounded-xl border border-[#E2E0D8] hover:bg-gray-50 text-xs font-bold text-[#5A5851] hover:text-[#1F1E1D] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          <span>Accéder immédiatement</span>
          <ArrowRight size={13} />
        </button>

      </div>
    </div>
  );
}
