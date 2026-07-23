import type { IncidentReport, IncidentPriority, IncidentStatus, IncidentSource } from "@/lib/types";

export type IncidentSeverity = "faible" | "moyenne" | "critique";

export type Incident = IncidentReport & {
  severity: IncidentSeverity;
};

// In-memory store for Incident Reports per restaurant
const incidentsStore = new Map<string, IncidentReport[]>();

// Rate-limiting tracker: map of `${restaurantId}:${reporterIdOrIp}:${YYYY-MM-DD}` -> boolean
const rateLimitTracker = new Map<string, boolean>();

export function isRateLimited(restaurantId: string, reporterId: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  const key = `ratelimit:${restaurantId}:${reporterId}:${today}`;
  return Boolean(rateLimitTracker.get(key));
}

export function recordRateLimit(restaurantId: string, reporterId: string): void {
  const today = new Date().toISOString().split("T")[0];
  const key = `ratelimit:${restaurantId}:${reporterId}:${today}`;
  rateLimitTracker.set(key, true);
}

export function getIncidents(restaurantId: string): Incident[] {
  if (!incidentsStore.has(restaurantId)) {
    const defaultIncidents: Incident[] = [
      {
        id: "inc-101",
        restaurantId,
        source: "client",
        reporterName: "Jean-Philippe Gauthier",
        reporterEmail: "jp.gauthier@gmail.com",
        title: "Attente prolongée au comptoir & température plat",
        description: "Commande #402 servie avec 25 minutes de retard. La soupe au pistou était tiède.",
        priority: "haute",
        severity: "critique",
        status: "nouveau",
        mediaUrls: [],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "inc-102",
        restaurantId,
        source: "employe",
        reporterName: "Marie Lavoie (Service)",
        title: "Rupture de stock sauce tomate bio & emballages",
        description: "Le stock tampon en réserve est épuisé avant le coup de feu du soir.",
        priority: "moyenne",
        severity: "moyenne",
        status: "assigne",
        mediaUrls: [],
        assignedToId: "usr-alex",
        assignedToName: "Alexandre Tremblay",
        createdAt: new Date(Date.now() - 14400000).toISOString(),
      },
    ];
    incidentsStore.set(restaurantId, defaultIncidents);
  }
  return incidentsStore.get(restaurantId) || [];
}

export function createIncidentReport(input: {
  restaurantId: string;
  source: IncidentSource;
  reporterName: string;
  reporterEmail?: string;
  reporterId: string;
  title: string;
  description: string;
  priority: IncidentPriority;
  severity?: IncidentSeverity;
  mediaUrls?: string[];
  audioUrl?: string;
}): { incident?: Incident; error?: string } {
  // Rate-limiting check: max 1 report per day
  if (isRateLimited(input.restaurantId, input.reporterId)) {
    return {
      error: "Vous avez déjà soumis un rapport d'incident aujourd'hui. Limite : 1 rapport par jour par utilisateur.",
    };
  }

  const incident: Incident = {
    id: `inc-${Date.now()}`,
    restaurantId: input.restaurantId,
    source: input.source,
    reporterName: input.reporterName,
    reporterEmail: input.reporterEmail,
    title: input.title,
    description: input.description,
    priority: input.priority,
    severity: input.severity || "faible",
    status: "nouveau",
    mediaUrls: input.mediaUrls || [],
    audioUrl: input.audioUrl,
    createdAt: new Date().toISOString(),
  };

  const list = getIncidents(input.restaurantId);
  list.unshift(incident);
  incidentsStore.set(input.restaurantId, list);

  // Record rate limiting
  recordRateLimit(input.restaurantId, input.reporterId);

  return { incident };
}

export function assignIncident(
  restaurantId: string,
  incidentId: string,
  assignedToId: string,
  assignedToName: string
): IncidentReport | null {
  const list = getIncidents(restaurantId);
  const inc = list.find((item) => item.id === incidentId);
  if (!inc) return null;

  inc.assignedToId = assignedToId;
  inc.assignedToName = assignedToName;
  inc.status = "assigne";
  incidentsStore.set(restaurantId, [...list]);
  return inc;
}

export function resolveIncident(
  restaurantId: string,
  incidentId: string,
  justification: string
): IncidentReport | null {
  const list = getIncidents(restaurantId);
  const inc = list.find((item) => item.id === incidentId);
  if (!inc) return null;

  inc.status = "resolu";
  inc.justification = justification;
  inc.resolvedAt = new Date().toISOString();
  incidentsStore.set(restaurantId, [...list]);
  return inc;
}

export type CreateIncidentInput = {
  restaurantId?: string;
  title: string;
  description: string;
  severity?: "low" | "medium" | "high" | "critical";
  status?: "open" | "investigating" | "resolved" | "closed";
};

export async function createIncident(input: CreateIncidentInput): Promise<boolean> {
  const result = createIncidentReport({
    restaurantId: input.restaurantId || "default",
    source: "employe",
    reporterName: "Administrateur Plateforme",
    reporterId: `admin-${Date.now()}`,
    title: input.title,
    description: input.description,
    priority: input.severity === "critical" ? "urgente" : input.severity === "high" ? "haute" : input.severity === "medium" ? "moyenne" : "basse",
  });
  return !result.error;
}
