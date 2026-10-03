import { describe, expect, it } from "vitest";
import { ACADEMY_PAGES, getAcademyPage, getAcademyPages } from "@/lib/data/team-academy";
import { isGoalMetric } from "@/lib/data/team-goals";

describe("Académie — accès par rôle", () => {
  it("ne sert aucune section réservée à l'équipe à un ambassadeur", () => {
    const sections = getAcademyPages(false).flatMap((page) => page.sections);
    expect(sections.length).toBeGreaterThan(0);
    expect(sections.some((section) => section.teamOnly)).toBe(false);
  });

  it("sert les sections internes aux membres de l'équipe", () => {
    const internal = ACADEMY_PAGES.flatMap((page) => page.sections).filter((section) => section.teamOnly);
    expect(internal.length).toBeGreaterThan(0);
    const served = new Set(getAcademyPages(true).flatMap((page) => page.sections.map((s) => s.id)));
    for (const section of internal) expect(served.has(section.id)).toBe(true);
  });

  it("ne laisse fuiter aucun chiffre interne dans le texte vu par un ambassadeur", () => {
    const visible = JSON.stringify(getAcademyPages(false));
    // Revenue/targets/«constats terrain» live only in teamOnly sections.
    expect(visible).not.toMatch(/MRR|120 \$|89 %|42 %|78 \$|98 %/);
  });

  it("retourne null pour une page inconnue", () => {
    expect(getAcademyPage("inconnue", true)).toBeNull();
  });

  it("étiquette chaque affirmation chiffrée de la page GTM", () => {
    const gtm = ACADEMY_PAGES.find((page) => page.slug === "gtm");
    const untagged = (gtm?.sections ?? []).flatMap((s) => s.items ?? []).filter((item) => /\d/.test(item.text) && !item.tag);
    expect(untagged).toEqual([]);
  });
});

describe("Objectifs — métriques valides", () => {
  it("accepte seulement les métriques connues", () => {
    expect(isGoalMetric("mrr")).toBe(true);
    expect(isGoalMetric("restaurants_new")).toBe(true);
    expect(isGoalMetric("revenue; drop table")).toBe(false);
  });
});
