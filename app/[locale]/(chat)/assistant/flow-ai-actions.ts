"use server";

import { revalidatePath } from "next/cache";
import { updateMenuItem } from "@/lib/data/menu";
import { createCampaign } from "@/lib/data/campaigns";
import { createEmployeeTask } from "@/lib/data/employee-tasks";
import { getEmployees } from "@/lib/data/employees";
import {
  saveCanvasDoc,
  deleteCanvasDoc,
  createProjectFolder,
  deleteProjectFolder,
  deleteConversation,
  renameConversation,
  togglePinConversation,
  updateConversationAgent,
  updateConversationDossiers,
  createCustomAgent,
  deleteCustomAgent,
} from "@/lib/data/chat";
import type { CampaignChannel, CampaignType } from "@/lib/types";

// ── 1. Action Menu (Prix / Disponibilité) ───────────────────────────────────
export async function executeMenuItemUpdateAction(input: {
  restaurantId: string;
  itemId: string;
  price?: number;
  active?: boolean;
}) {
  try {
    const updated = await updateMenuItem(input.restaurantId, input.itemId, {
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });
    if (!updated) return { success: false, error: "Plat non trouvé ou non modifiable." };

    revalidatePath("/menu");
    revalidatePath("/assistant");
    return {
      success: true,
      message: `Plat « ${updated.name} » mis à jour : Prix ${updated.price.toFixed(2)} $ · ${
        updated.active ? "Disponible" : "Épuisé"
      }`,
      item: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

// ── 2. Action Campagne Fidélisation ─────────────────────────────────────────
export async function executeLoyaltyCampaignAction(input: {
  restaurantId: string;
  name: string;
  description?: string;
  channel?: CampaignChannel;
  type?: CampaignType;
  startDate?: string;
  endDate?: string;
  cost?: number;
  estimatedRevenue?: number;
}) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const created = await createCampaign(input.restaurantId, {
      name: input.name,
      description: input.description ?? "Campagne ciblée générée par Flow AI",
      channel: input.channel ?? "Email",
      type: input.type ?? "email",
      startDate: input.startDate ?? today,
      endDate: input.endDate ?? today,
      cost: input.cost ?? 0,
      status: "planifiee",
      estimatedRevenue: input.estimatedRevenue ?? 500,
    });

    if (!created) return { success: false, error: "Impossible de créer la campagne." };

    revalidatePath("/campaigns");
    revalidatePath("/assistant");
    return {
      success: true,
      message: `Campagne « ${created.name} » créée avec succès !`,
      campaign: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

// ── 3. Action Tâche Collaborateur ──────────────────────────────────────────
export async function executeStaffTaskAction(input: {
  restaurantId: string;
  employeeId?: string;
  employeeName?: string;
  title: string;
  description?: string;
}) {
  try {
    let targetEmployeeId = input.employeeId;
    let targetName = input.employeeName ?? "Collaborateur";

    if (!targetEmployeeId) {
      const employees = await getEmployees(input.restaurantId);
      const matched = input.employeeName
        ? employees.find((e) => e.fullName.toLowerCase().includes(input.employeeName!.toLowerCase()))
        : employees[0];

      if (matched) {
        targetEmployeeId = matched.id;
        targetName = matched.fullName;
      }
    }

    if (!targetEmployeeId) {
      return { success: false, error: "Aucun collaborateur trouvé pour assigner cette tâche." };
    }

    const task = await createEmployeeTask(
      {
        restaurantId: input.restaurantId,
        employeeId: targetEmployeeId,
        title: input.title,
        description: input.description ?? null,
      },
      targetName
    );

    if (!task) return { success: false, error: "Échec de création de la tâche." };

    revalidatePath("/collaborateurs");
    revalidatePath("/assistant");
    return {
      success: true,
      message: `Tâche « ${input.title} » assignée à ${targetName}.`,
      task,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

// ── 4. Action Sauvegarde Canvas ────────────────────────────────────────────
export async function executeCanvasSaveAction(input: {
  id?: string;
  restaurantId: string;
  conversationId?: string | null;
  title: string;
  content: string;
  contentJson?: Record<string, unknown>;
}) {
  try {
    const doc = await saveCanvasDoc(input);
    if (!doc) return { success: false, error: "Impossible de sauvegarder le document." };
    return { success: true, doc };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

// ── 5. Action Épinglage Session ─────────────────────────────────────────────
export async function executeTogglePinAction(conversationId: string, isPinned: boolean) {
  try {
    const ok = await togglePinConversation(conversationId, isPinned);
    revalidatePath("/assistant");
    return { success: ok };
  } catch {
    return { success: false };
  }
}

// ── 6. Action Changement Spécialiste ───────────────────────────────────────
export async function executeUpdateAgentAction(conversationId: string, agentId: string) {
  try {
    const ok = await updateConversationAgent(conversationId, agentId);
    return { success: ok };
  } catch {
    return { success: false };
  }
}

// ── 7. Action Mise à jour Dossiers RAG ─────────────────────────────────────
export async function executeUpdateDossiersAction(conversationId: string, activeDossiers: string[]) {
  try {
    const ok = await updateConversationDossiers(conversationId, activeDossiers);
    return { success: ok };
  } catch {
    return { success: false };
  }
}

// ── 8. Action Création d'Agent Custom ──────────────────────────────────────
export async function executeCreateCustomAgentAction(input: {
  restaurantId: string;
  name: string;
  role: string;
  avatar?: string;
  description?: string;
  systemPrompt: string;
  tone?: string;
  skills?: string[];
}) {
  try {
    const agent = await createCustomAgent(input);
    if (!agent) return { success: false, error: "Impossible de créer l'agent." };
    revalidatePath("/assistant/agents");
    return { success: true, agent };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

// ── 9. Action Suppression d'Agent Custom ───────────────────────────────────
export async function executeDeleteCustomAgentAction(id: string) {
  try {
    const ok = await deleteCustomAgent(id);
    revalidatePath("/assistant/agents");
    return { success: ok };
  } catch {
    return { success: false };
  }
}

// ── 10. Action Suppression Document Canvas ─────────────────────────────────
export async function executeDeleteCanvasDocAction(id: string) {
  try {
    const ok = await deleteCanvasDoc(id);
    revalidatePath("/assistant");
    return { success: ok };
  } catch {
    return { success: false };
  }
}

// ── 11. Action Création Dossier Projet ───────────────────────────────────────
export async function executeCreateProjectFolderAction(input: {
  restaurantId: string;
  name: string;
  description?: string;
}) {
  try {
    const folder = await createProjectFolder(input.restaurantId, input.name, undefined, input.description);
    if (!folder) return { success: false, error: "Impossible de créer le dossier." };
    revalidatePath("/assistant");
    return { success: true, folder };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

// ── 12. Action Suppression Dossier Projet ───────────────────────────────────
export async function executeDeleteProjectFolderAction(id: string) {
  try {
    const ok = await deleteProjectFolder(id);
    revalidatePath("/assistant");
    return { success: ok };
  } catch {
    return { success: false };
  }
}

// ── 13. Action Renommage Session ───────────────────────────────────────────
export async function executeRenameSessionAction(id: string, title: string) {
  try {
    await renameConversation(id, title);
    revalidatePath("/assistant");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ── 14. Action Suppression / Archivage Session ─────────────────────────────
export async function executeDeleteSessionAction(id: string) {
  try {
    const ok = await deleteConversation(id);
    revalidatePath("/assistant");
    return { success: ok };
  } catch {
    return { success: false };
  }
}
