export type FunnelStageKey = "registered" | "activated" | "paying";

export type FunnelStage = {
  key: FunnelStageKey;
  label: string;
  count: number;
  /** Share of the previous stage that reached this one (0–100); null when there is no previous stage or it is empty. */
  conversionFromPrevious: number | null;
};

export type FocusAction = { title: string; reason: string };

export type GtmFocus = {
  /** The one number to move this month. */
  metric: "activated_restaurants" | "mrr";
  label: string;
  actual: number;
  target: number | null;
  actions: FocusAction[];
};

export const PILOT_TARGET = 3;
export const GOALS_TOTAL = 5;

export function buildFunnel(counts: { registered: number; activated: number; paying: number }): FunnelStage[] {
  const pct = (part: number, whole: number) => (whole > 0 ? Math.min(100, (part / whole) * 100) : null);
  return [
    { key: "registered", label: "Restaurants inscrits", count: counts.registered, conversionFromPrevious: null },
    { key: "activated", label: "Restaurants activés", count: counts.activated, conversionFromPrevious: pct(counts.activated, counts.registered) },
    { key: "paying", label: "Abonnements payants", count: counts.paying, conversionFromPrevious: pct(counts.paying, counts.activated) },
  ];
}

type FocusInput = {
  registered: number;
  activated: number;
  paying: number;
  mrr: number;
  visitorsConnected: boolean;
  goalsSet: number;
  activatedTarget: number | null;
  mrrTarget: number | null;
};

/**
 * Constraint-first, and fully explainable: every action carries the numbers
 * that triggered it. Activation is the constraint until someone pays — a
 * product that does not yet activate restaurants has no funnel to optimise
 * further down.
 */
export function deriveGtmFocus(input: FocusInput): GtmFocus {
  const { registered, activated, paying } = input;
  const activationRate = registered > 0 ? (activated / registered) * 100 : null;
  const actions: FocusAction[] = [];

  if (activated < PILOT_TARGET) {
    const missing = PILOT_TARGET - activated;
    actions.push({
      title: `Faire activer ${missing} restaurant${missing > 1 ? "s" : ""} de plus`,
      reason: `${activated} activé${activated > 1 ? "s" : ""} sur ${registered} inscrits : l’écart se joue sur le menu publié et le premier client inscrit. Visez ${PILOT_TARGET} pilotes suivis de bout en bout.`,
    });
  }

  if (registered >= 10 && activationRate !== null && activationRate < 25) {
    actions.push({
      title: "Réduire la friction d’activation",
      reason: `${registered - activated} restaurants inscrits n’ont ni menu publié ni client (${activationRate.toFixed(0)} % d’activation). Appelez-les ou simplifiez les deux premiers pas.`,
    });
  }

  if (paying === 0 && activated >= PILOT_TARGET) {
    actions.push({
      title: "Transformer les pilotes en premiers abonnés",
      reason: `${activated} restaurants activés, aucun abonnement payant : proposez l’offre aux pilotes les plus actifs.`,
    });
  }

  if (!input.visitorsConnected) {
    actions.push({
      title: "Brancher PostHog",
      reason: "Sans trafic mesuré, on ne voit ni d’où viennent les inscrits ni où ils décrochent.",
    });
  }

  if (input.goalsSet < GOALS_TOTAL) {
    actions.push({
      title: "Définir les cibles du mois",
      reason: `${input.goalsSet} cible${input.goalsSet > 1 ? "s" : ""} sur ${GOALS_TOTAL} définie${input.goalsSet > 1 ? "s" : ""} : sans cible, la barre de progression ne dit rien.`,
    });
  }

  const onActivation = paying === 0;
  return {
    metric: onActivation ? "activated_restaurants" : "mrr",
    label: onActivation ? "Restaurants activés" : "MRR",
    actual: onActivation ? activated : input.mrr,
    target: onActivation ? input.activatedTarget : input.mrrTarget,
    actions: actions.slice(0, 3),
  };
}
