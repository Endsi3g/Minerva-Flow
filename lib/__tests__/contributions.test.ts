import { describe, expect, it } from "vitest";
import { buildHeatmap, heatmapStart, levelFor, mondayOf, toMontrealDate } from "@/lib/team/contributions";

// 2026-10-02 is a Friday.
const TODAY = "2026-10-02";

describe("contributions — calendrier", () => {
  it("compte les jours en heure de Montréal, pas en UTC", () => {
    // 01:30 UTC le 3 oct. = 21:30 le 2 oct. à Montréal (UTC-4 en octobre).
    expect(toMontrealDate("2026-10-03T01:30:00Z")).toBe("2026-10-02");
    expect(toMontrealDate("2026-10-02T12:00:00Z")).toBe("2026-10-02");
  });

  it("trouve le lundi de la semaine, y compris un dimanche", () => {
    expect(mondayOf("2026-10-02")).toBe("2026-09-28");
    expect(mondayOf("2026-09-28")).toBe("2026-09-28");
    expect(mondayOf("2026-10-04")).toBe("2026-09-28"); // dimanche
    expect(mondayOf("2026-03-01")).toBe("2026-02-23"); // franchit un mois
  });

  it("construit 26 semaines complètes qui commencent un lundi", () => {
    const heatmap = buildHeatmap([], TODAY);
    expect(heatmap.days).toHaveLength(26 * 7);
    expect(heatmap.days[0].date).toBe(heatmapStart(TODAY));
    expect(heatmap.days[0].date).toBe("2026-04-06");
    expect(mondayOf(heatmap.days[0].date)).toBe(heatmap.days[0].date);
  });

  it("marque les jours futurs de la semaine en cours", () => {
    const { days } = buildHeatmap([], TODAY);
    expect(days.find((d) => d.date === "2026-10-02")?.future).toBe(false);
    expect(days.find((d) => d.date === "2026-10-03")?.future).toBe(true);
  });
});

describe("contributions — comptage", () => {
  it("additionne les sources d'un même jour et garde le détail", () => {
    const heatmap = buildHeatmap(
      [
        { date: "2026-10-01", source: "github" },
        { date: "2026-10-01", source: "github" },
        { date: "2026-10-01", source: "content" },
      ],
      TODAY
    );
    const day = heatmap.days.find((d) => d.date === "2026-10-01");
    expect(day?.count).toBe(3);
    expect(day?.bySource).toEqual({ github: 2, content: 1 });
    expect(heatmap.total).toBe(3);
    expect(heatmap.bySource.github).toBe(2);
  });

  it("ignore les événements hors fenêtre et ceux du futur", () => {
    const heatmap = buildHeatmap(
      [
        { date: "2026-04-05", source: "github" }, // la veille du premier jour affiché
        { date: "2026-10-03", source: "github" }, // demain
        { date: "2026-04-06", source: "github" }, // premier jour affiché
      ],
      TODAY
    );
    expect(heatmap.total).toBe(1);
  });

  it("applique les paliers d'intensité", () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(levelFor)).toEqual([0, 1, 2, 3, 3, 4, 4]);
  });
});
