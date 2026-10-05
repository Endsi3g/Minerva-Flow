"use client";


import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const SEEN_KEY = "mv_team_intro_seen";

/**
 * Text-only, one line at a time, nothing else on screen — explicitly asked
 * for ("pas d'éléments, de composants") in the style of a stripped-down
 * product intro rather than an illustrated onboarding carousel. Shown once
 * after login (localStorage-gated) and replayable later from the portal nav.
 */
export function TeamOnboardingIntro({
  isTeamMember,
  onDone,
}: {
  isTeamMember: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("teamIntro");
  const lines = buildLines(isTeamMember);
  const [index, setIndex] = useState(0);
  const isLast = index === lines.length - 1;

  useEffect(() => {
    if (isLast) return;
    const timer = window.setTimeout(() => setIndex((i) => i + 1), 3400);
    return () => window.clearTimeout(timer);
  }, [index, isLast]);

  function finish() {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private browsing or disabled storage — the intro just replays next
      // time, which is a fine fallback, not worth failing the dismiss over.
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mv-cream px-6">
      <button
        type="button"
        onClick={finish}
        className="absolute right-6 top-6 text-[12.5px] font-medium text-mv-ink-faint hover:text-mv-ink"
      >
        Passer
      </button>

      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-2xl text-center font-display text-[26px] font-medium leading-snug text-mv-ink sm:text-[34px]"
        >
          {lines[index]}
        </motion.p>
      </AnimatePresence>

      {isLast && (
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          onClick={finish}
          className="absolute bottom-16 rounded-full bg-mv-green px-6 py-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-mv-green-dark"
        >
          {t("enterTheSpace")}
        </motion.button>
      )}
    </div>
  );
}

export function hasSeenTeamOnboardingIntro(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function buildLines(isTeamMember: boolean): string[] {
  const t = useTranslations("teamIntro");
  return [
    "Bienvenue chez Minerva Flow.",
    t("whetherYouAreAn"),
    t("weAreBuildingThe"),
    t("ourValuesRigorBefore"),
    t("whatWeExpectOf"),
    isTeamMember
      ? t("hereTheDashboardTracks")
      : t("hereYourSpaceTracks"),
    t("welcomeAboard"),
  ];
}
