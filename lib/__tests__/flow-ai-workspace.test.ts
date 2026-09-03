import { describe, it, expect } from "vitest";
import { FLOW_AI_SPECIALISTS, getSpecialistById } from "@/lib/ai/specialists";
import { FLOW_AI_SKILLS, getSkillById } from "@/lib/ai/skills";
import { DEFAULT_DOSSIERS } from "@/lib/ai/dossier-types";
import { extractMinervaActions } from "@/lib/ai/actions";

describe("Flow AI Specialists Registry", () => {
  it("should contain the 4 core specialists and general specialist", () => {
    expect(FLOW_AI_SPECIALISTS.length).toBeGreaterThanOrEqual(5);

    const specialistIds = FLOW_AI_SPECIALISTS.map((s) => s.id);
    expect(specialistIds).toContain("menu-engineer");
    expect(specialistIds).toContain("prime-cost-auditor");
    expect(specialistIds).toContain("retention-strategist");
    expect(specialistIds).toContain("service-coach");
    expect(specialistIds).toContain("general");
  });

  it("should retrieve the specialist by id with fallback to general", () => {
    const engineer = getSpecialistById("menu-engineer");
    expect(engineer.name).toBe("Menu & Cost Engineer");
    expect(engineer.avatar).toBe("👨‍🍳");
    expect(engineer.systemPromptAddendum).toContain("Food Cost");

    const fallback = getSpecialistById("unknown-specialist");
    expect(fallback.id).toBe("general");
  });
});

describe("Flow AI Skills Registry", () => {
  it("should define all essential 1-click operational skills", () => {
    expect(FLOW_AI_SKILLS.length).toBeGreaterThanOrEqual(7);

    const menuSkill = getSkillById("update_menu_item");
    expect(menuSkill).toBeDefined();
    expect(menuSkill?.inputs.map((i) => i.name)).toContain("plat");

    const primeCostSkill = getSkillById("audit_prime_cost");
    expect(primeCostSkill).toBeDefined();
    expect(primeCostSkill?.category).toBe("finance");
  });
});

describe("Flow AI Action Parser (minerva-action:*)", () => {
  it("should parse inline minerva-action markdown blocks into interactive payload cards", () => {
    const rawMarkdown = `
Bonjour Denis, j'ai identifié un déséquilibre sur votre burger.

\`\`\`minerva-action:menu
{
  "action": "update_menu_item",
  "title": "Ajuster le plat",
  "itemId": "item-123",
  "name": "Burger Signature",
  "price": 18.90,
  "active": true,
  "reason": "Réaligner le food cost sous 30%"
}
\`\`\`

Voici également une proposition de campagne :

\`\`\`minerva-action:campaign
{
  "action": "create_campaign",
  "title": "Relance Habitués",
  "name": "Relance 14j",
  "channel": "Email",
  "estimatedRevenue": 650
}
\`\`\`
    `;

    const { cleanContent, actions } = extractMinervaActions(rawMarkdown);

    expect(actions).toHaveLength(2);
    expect(actions[0].type).toBe("menu");
    if (actions[0].type === "menu") {
      expect(actions[0].name).toBe("Burger Signature");
      expect(actions[0].price).toBe(18.9);
    }

    expect(actions[1].type).toBe("campaign");
    if (actions[1].type === "campaign") {
      expect(actions[1].name).toBe("Relance 14j");
      expect(actions[1].estimatedRevenue).toBe(650);
    }

    // Le contenu nettoyé ne doit plus contenir les balises brutes
    expect(cleanContent).not.toContain("```minerva-action:menu");
    expect(cleanContent).not.toContain("```minerva-action:campaign");
    expect(cleanContent).toContain("Bonjour Denis");
  });
});

describe("Flow AI Context Dossiers", () => {
  it("should provide the 5 standard restaurant dossiers", () => {
    expect(DEFAULT_DOSSIERS).toHaveLength(5);
    const slugs = DEFAULT_DOSSIERS.map((d) => d.slug);
    expect(slugs).toEqual(["menu", "finance", "loyalty", "operations", "custom"]);
  });
});
