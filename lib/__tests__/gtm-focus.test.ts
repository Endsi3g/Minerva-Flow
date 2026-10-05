import { describe, expect, it } from "vitest";
import { buildFunnel, deriveGtmFocus } from "@/lib/team/gtm-focus";

const base = { registered: 94, activated: 2, paying: 0, mrr: 0, visitorsConnected: false, goalsSet: 0, activatedTarget: null, mrrTarget: null };

describe("entonnoir", () => {
  it("calcule la conversion entre étapes de restaurants", () => {
    const [registered, activated, paying] = buildFunnel({ registered: 100, activated: 20, paying: 5 });
    expect(registered.conversionFromPrevious).toBeNull();
    expect(activated.conversionFromPrevious).toBe(20);
    expect(paying.conversionFromPrevious).toBe(25);
  });

  it("ne divise jamais par zéro", () => {
    const stages = buildFunnel({ registered: 0, activated: 0, paying: 0 });
    expect(stages.every((s) => s.conversionFromPrevious === null)).toBe(true);
  });

  it("plafonne à 100 % si une étape dépasse la précédente", () => {
    expect(buildFunnel({ registered: 5, activated: 8, paying: 0 })[1].conversionFromPrevious).toBe(100);
  });
});

describe("le chiffre du mois", () => {
  it("vise l'activation tant que personne ne paie", () => {
    const focus = deriveGtmFocus({ ...base, activatedTarget: 3 });
    expect(focus).toMatchObject({ metric: "activated_restaurants", actual: 2, target: 3 });
  });

  it("passe au MRR dès le premier abonnement payant", () => {
    const focus = deriveGtmFocus({ ...base, paying: 1, mrr: 150, mrrTarget: 1000 });
    expect(focus).toMatchObject({ metric: "mrr", actual: 150, target: 1000 });
  });
});

describe("prochaines actions", () => {
  it("met d'abord le goulot d'activation, avec les chiffres qui le justifient", () => {
    const [first] = deriveGtmFocus(base).actions;
    expect(first.title).toBe("Faire activer 1 restaurant de plus");
    expect(first.reason).toContain("2 activés sur 94 inscrits");
  });

  it("ne dépasse jamais trois actions", () => {
    expect(deriveGtmFocus(base).actions.length).toBeLessThanOrEqual(3);
  });

  it("signale la friction quand moins d'un inscrit sur quatre s'active", () => {
    const titles = deriveGtmFocus(base).actions.map((a) => a.title);
    expect(titles).toContain("Réduire la friction d’activation");
  });

  it("ne réclame PostHog et les cibles que s'ils manquent", () => {
    const done = deriveGtmFocus({ ...base, activated: 5, visitorsConnected: true, goalsSet: 5, activatedTarget: 5 });
    const titles = done.actions.map((a) => a.title);
    expect(titles).not.toContain("Brancher PostHog");
    expect(titles).not.toContain("Définir les cibles du mois");
  });

  it("propose de convertir les pilotes une fois l'activation atteinte", () => {
    const titles = deriveGtmFocus({ ...base, activated: 4, registered: 20 }).actions.map((a) => a.title);
    expect(titles).toContain("Transformer les pilotes en premiers abonnés");
  });

  it("ne suggère rien d'inventé quand tout est en place", () => {
    const done = deriveGtmFocus({ ...base, registered: 20, activated: 10, paying: 4, mrr: 600, visitorsConnected: true, goalsSet: 5 });
    expect(done.actions).toEqual([]);
  });
});
