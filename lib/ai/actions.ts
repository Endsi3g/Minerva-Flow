import type { CampaignChannel } from "@/lib/types";

export type FlowAiActionPayload =
  | {
      type: "menu";
      action: "update_menu_item";
      title: string;
      itemId: string;
      name: string;
      price?: number;
      active?: boolean;
      reason?: string;
    }
  | {
      type: "campaign";
      action: "create_campaign";
      title: string;
      name: string;
      description?: string;
      channel?: CampaignChannel;
      typeCategory?: "relance" | "nouveaute";
      startDate?: string;
      estimatedRevenue?: number;
    }
  | {
      type: "task";
      action: "create_task";
      title: string;
      employeeName?: string;
      taskTitle: string;
      description?: string;
    }
  | {
      type: "canvas";
      action: "insert_to_canvas";
      title: string;
      content: string;
    };

/**
 * Analyse le texte markdown pour détecter et extraire les blocs minerva-action:*
 */
export function extractMinervaActions(content: string): { cleanContent: string; actions: FlowAiActionPayload[] } {
  const actions: FlowAiActionPayload[] = [];
  const actionRegex = /```minerva-action:(menu|campaign|task|canvas)\s*([\s\S]*?)```/g;

  const cleanContent = content.replace(actionRegex, (_, type, jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr.trim());
      if (type === "menu") {
        actions.push({ type: "menu", ...parsed });
      } else if (type === "campaign") {
        actions.push({ type: "campaign", ...parsed });
      } else if (type === "task") {
        actions.push({ type: "task", ...parsed });
      } else if (type === "canvas") {
        actions.push({ type: "canvas", ...parsed });
      }
    } catch (e) {
      console.error("Failed to parse minerva-action JSON:", e);
    }
    return ""; // Retire le bloc de code brut pour afficher la carte interactive
  });

  return { cleanContent, actions };
}
