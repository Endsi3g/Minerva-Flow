"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AuthUser } from "@/lib/app-context";
import { isDemoAccount } from "@/lib/demo";
import {
  Compass,
  Hammer,
  ListChecks,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

const STORAGE_KEY = "mv_demo_guide_seen_v1";

type Step = {
  icon: typeof Compass;
  eyebrow: string;
  title: string;
  body: ReactNode;
};

const STEPS: Step[] = [
  {
    icon: Compass,
    eyebrow: "1 · Comment utiliser l'application",
    title: "Six outils, un seul but : décider plus vite",
    body: (
      <div className="space-y-2.5 text-[13.5px] leading-relaxed text-mv-ink-soft">
        <p>La barre latérale gauche regroupe les 6 outils principaux d&apos;un restaurateur :</p>
        <ul className="list-disc space-y-1.5 pl-4">
          <li>
            <strong className="font-semibold text-mv-ink">Aperçu</strong> — l&apos;état du commerce en un coup
            d&apos;œil, chaque matin.
          </li>
          <li>
            <strong className="font-semibold text-mv-ink">Flow AI</strong> — posez une question en langage naturel
            sur vos propres données.
          </li>
          <li>
            <strong className="font-semibold text-mv-ink">Menu</strong> — quels plats sont rentables, lesquels
            dérivent en marge.
          </li>
          <li>
            <strong className="font-semibold text-mv-ink">Fidélisation</strong> — qui revient, qui décroche, qui
            parraine.
          </li>
          <li>
            <strong className="font-semibold text-mv-ink">Finance</strong> — flux financiers et seuil de
            rentabilité.
          </li>
          <li>
            <strong className="font-semibold text-mv-ink">Commandes, Collaborateurs, Inventaire</strong> —
            l&apos;opérationnel du quotidien.
          </li>
        </ul>
        <p>
          Un outil ou un rapport en particulier ? Cherchez-le avec <kbd className="rounded border border-mv-border bg-mv-cream-soft px-1.5 py-0.5 text-[11px]">⌘K</kbd> depuis n&apos;importe quelle page.
        </p>
      </div>
    ),
  },
  {
    icon: Hammer,
    eyebrow: "2 · Comment elle a été construite",
    title: "Une vraie application, pas une maquette",
    body: (
      <div className="space-y-2.5 text-[13.5px] leading-relaxed text-mv-ink-soft">
        <p>
          Minerva Flow tourne sur une pile moderne (Next.js, Supabase, Vercel) — chaque chiffre que vous voyez ici
          vient d&apos;une vraie base de données, pas d&apos;un fichier de démo statique.
        </p>
        <p>
          Les intégrations affichées (caisse Square, Google, plateformes publicitaires, Stripe) sont de vraies
          connexions OAuth fonctionnelles — pas des boutons décoratifs. Quand une intégration n&apos;est pas encore
          branchée pour ce compte, l&apos;application le dit clairement (« Pas encore disponible ») plutôt que de
          simuler un faux statut.
        </p>
        <p>
          Ce compte démo, lui, est peuplé de données réalistes générées automatiquement — mêmes tables, mêmes
          règles, mêmes calculs qu&apos;un vrai restaurant.
        </p>
      </div>
    ),
  },
  {
    icon: Sparkles,
    eyebrow: "3 · La mentalité derrière l'outil",
    title: "Deux piliers, pas cinquante fonctionnalités",
    body: (
      <div className="space-y-2.5 text-[13.5px] leading-relaxed text-mv-ink-soft">
        <p>
          Minerva Flow ne cherche pas à faire de la tarification dynamique ou à vous noyer sous les tableaux de
          bord. Deux piliers, choisis parce que ce sont eux qui font vraiment bouger la rentabilité d&apos;un
          restaurant indépendant :
        </p>
        <p>
          <strong className="font-semibold text-mv-ink">Menu Engineering</strong> — savoir quels plats sont
          rentables (matrice BCG) et repérer une dérive de marge avant qu&apos;elle ne coûte cher, sans jamais
          toucher aux prix à votre place.
        </p>
        <p>
          <strong className="font-semibold text-mv-ink">Fidélisation & rétention</strong> — un moteur qui détecte
          l&apos;inactivité, les anniversaires et le décrochage de valeur, puis agit automatiquement — plutôt qu&apos;un
          simple programme de points qu&apos;il faut animer soi-même.
        </p>
        <p>Chaque insight affiché débouche sur une action en un clic — jamais un chiffre sans suite.</p>
      </div>
    ),
  },
  {
    icon: ListChecks,
    eyebrow: "4 · Ce qui est déjà en place",
    title: "Rien de tout ceci n'est un mockup",
    body: (
      <div className="space-y-1.5 text-[13.5px] leading-relaxed text-mv-ink-soft">
        <ul className="list-disc space-y-1.5 pl-4">
          <li>Matrice BCG du menu + alerte automatique de dérive de marge</li>
          <li>Moteur de rétention automatisé (inactivité, anniversaire, décrochage comportemental) multi-canal</li>
          <li>Paliers de fidélité premium — Habitué, Privilégié, Ambassadeur</li>
          <li>Parrainage à double sens (récompense le parrain et le filleul)</li>
          <li>Intégration caisse (Square) avec synchronisation automatique des ventes</li>
          <li>Assistant IA (Flow AI) qui répond à partir de vos vraies données</li>
          <li>Appareils connectés et sécurité du compte, dans Paramètres → Sécurité</li>
        </ul>
      </div>
    ),
  },
  {
    icon: TrendingUp,
    eyebrow: "5 · La valeur que vous pouvez en tirer",
    title: "Ce qu'il faut regarder pour juger la valeur",
    body: (
      <div className="space-y-2.5 text-[13.5px] leading-relaxed text-mv-ink-soft">
        <p>
          Sur <strong className="font-semibold text-mv-ink">Aperçu</strong>, le bloc « Revenu incrémental —
          fidélisation » chiffre concrètement ce que le moteur de rétention a généré, pas une promesse abstraite.
        </p>
        <p>
          Sur <strong className="font-semibold text-mv-ink">Menu</strong>, le panneau « Dérive de marge » montre
          l&apos;argent qui fuit silencieusement sur des plats qu&apos;on croyait rentables.
        </p>
        <p>
          Sur <strong className="font-semibold text-mv-ink">Finance</strong>, le simulateur de seuil de
          rentabilité répond en direct à « combien de clients par jour me faut-il ».
        </p>
        <p>
          Vous pouvez rouvrir ce guide à tout moment depuis la bulle en bas à droite de l&apos;écran — et repérer
          les petites icônes <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-mv-ink/10 text-[9px]">i</span> qui expliquent les éléments moins évidents partout dans l&apos;application.
        </p>
      </div>
    ),
  },
];

export function DemoGuideTour({ authUser }: { authUser: AuthUser | null }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const isDemo = isDemoAccount(authUser?.email);

  useEffect(() => {
    if (!isDemo) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      seen = false;
    }
    if (!seen) {
      const timer = setTimeout(() => setOpen(true), 900);
      return () => clearTimeout(timer);
    }
  }, [isDemo]);

  function markSeen() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable (private mode, etc.) — the guide will just
      // reopen next visit, which is a harmless fallback here.
    }
  }

  function close() {
    setOpen(false);
    markSeen();
    setStep(0);
  }

  function reopen() {
    setStep(0);
    setOpen(true);
  }

  if (!isDemo) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={reopen}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-mv-border bg-mv-surface px-4 py-2.5 text-[12.5px] font-semibold text-mv-ink shadow-mv-lg transition-transform hover:scale-[1.03]"
        >
          <Sparkles size={15} className="text-mv-green" />
          Guide de démo
        </button>
      )}

      <Modal open={open} onClose={close} title={current.title} width={620}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mv-green-tint text-mv-green-dark">
              <Icon size={17} />
            </div>
            <Badge tone="green" variant="subtle" size="sm">
              {current.eyebrow}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-mv-green" : "w-1.5 bg-mv-border"
                }`}
              />
            ))}
          </div>
        </div>

        {current.body}

        <div className="mt-6 flex items-center justify-between border-t border-mv-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft size={14} /> Précédent
          </Button>
          <button
            type="button"
            onClick={close}
            className="text-[12px] font-semibold text-mv-ink-faint hover:text-mv-ink-soft"
          >
            Passer le guide
          </button>
          {isLast ? (
            <Button size="sm" onClick={close}>
              <Check size={14} /> Terminer
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>
              Suivant <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
