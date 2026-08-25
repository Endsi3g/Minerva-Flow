"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import {
  createProspect,
  saveProspectAudit,
  updateProspectMenu,
  updateProspectMeta,
  updateProspectStatus,
  type CreateProspectInput,
  type UpdateProspectMetaInput,
} from "@/lib/data/prospects";
import { parseMenuText, emptyMenu } from "@/lib/prospects/parse-menu";
import { scrapeMenuFromUrl, type ScrapeResult } from "@/lib/prospects/scrape/fetch-menu";
import { runWebsiteAudit } from "@/lib/prospects/audit/run-audit";
import type {
  ProspectMenu,
  ProspectSourcePlatform,
  ProspectStatus,
  WebsiteAuditReport,
} from "@/lib/prospects/types";

export type CreateProspectFormInput = {
  sourceUrl: string;
  sourcePlatform: ProspectSourcePlatform;
  restaurantName: string;
  currency: string;
  detectedAddress?: string;
  commissionRatePct: number;
  assumedMonthlyOrders: number;
  pastedText?: string;
  /** Pre-fetched by scrapeMenuAction — takes priority over pastedText when present. */
  scrapedMenu?: ProspectMenu;
};

/**
 * Best-effort auto-scrape, called explicitly by the admin before generating —
 * never blocks prospect creation itself. Runs entirely in this one request
 * (no separate service, no job queue) — see lib/prospects/scrape/fetch-menu.ts
 * for the actual fetch+extract logic and its documented limits. Falls back to
 * manual paste on any failure (unreachable site, robots.txt disallow, no menu
 * found, or a platform that only renders its menu via client-side JS).
 */
export async function scrapeMenuAction(url: string, platform: ProspectSourcePlatform): Promise<ScrapeResult> {
  if (!(await isPlatformAdmin())) return { error: "unauthorized" };
  return scrapeMenuFromUrl(url, platform);
}

export async function createProspectAction(
  input: CreateProspectFormInput
): Promise<{ id: string } | null> {
  if (!(await isPlatformAdmin())) return null;
  if (!input.sourceUrl.trim() || !input.restaurantName.trim()) return null;

  const menu: ProspectMenu =
    input.scrapedMenu ?? (input.pastedText?.trim() ? parseMenuText(input.pastedText) : emptyMenu());

  const payload: CreateProspectInput = {
    sourceUrl: input.sourceUrl.trim(),
    sourcePlatform: input.sourcePlatform,
    restaurantName: input.restaurantName.trim(),
    currency: input.currency,
    detectedAddress: input.detectedAddress,
    commissionRatePct: input.commissionRatePct,
    assumedMonthlyOrders: input.assumedMonthlyOrders,
    menu,
  };

  const prospect = await createProspect(payload);
  if (!prospect) return null;

  revalidatePath("/admin/prospects");
  return { id: prospect.id };
}

export async function reparseProspectMenuAction(id: string, pastedText: string): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  const menu = pastedText.trim() ? parseMenuText(pastedText) : emptyMenu();
  const ok = await updateProspectMenu(id, menu);
  if (ok) {
    revalidatePath(`/admin/prospects/${id}`);
    revalidatePath("/admin/prospects");
  }
  return ok;
}

export async function updateProspectMenuAction(id: string, menu: ProspectMenu): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  const ok = await updateProspectMenu(id, menu);
  if (ok) {
    revalidatePath(`/admin/prospects/${id}`);
    revalidatePath("/admin/prospects");
  }
  return ok;
}

export async function updateProspectMetaAction(
  id: string,
  input: UpdateProspectMetaInput
): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  if (!input.restaurantName.trim()) return false;

  const ok = await updateProspectMeta(id, input);
  if (ok) {
    revalidatePath(`/admin/prospects/${id}`);
    revalidatePath("/admin/prospects");
  }
  return ok;
}

export async function updateProspectStatusAction(id: string, status: ProspectStatus): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  const ok = await updateProspectStatus(id, status);
  if (ok) {
    revalidatePath(`/admin/prospects/${id}`);
    revalidatePath("/admin/prospects");
  }
  return ok;
}

import { sendProspectAuditEmail, sendProspectRelanceEmail } from "@/lib/email/prospect-mailer";
import { generateEnrichedProspectAudit, type EnrichedAuditResult } from "@/lib/prospects/audit/ai-audit";
import { getProspectById, recordProspectFollowup } from "@/lib/data/prospects";

/**
 * Runs the website audit and persists it in the same call — the report is
 * only ever useful stored against the prospect (it's what the pitch reuses
 * next visit), so there's no separate "preview without saving" step.
 */
export async function runProspectAuditAction(
  id: string,
  url: string
): Promise<WebsiteAuditReport | { error: string }> {
  if (!(await isPlatformAdmin())) return { error: "unauthorized" };
  if (!url.trim()) return { error: "URL invalide." };

  const report = await runWebsiteAudit(url.trim());
  await saveProspectAudit(id, report);
  revalidatePath(`/admin/prospects/${id}`);
  return report;
}

export async function runEnrichedProspectAuditAction(
  id: string,
  url: string
): Promise<EnrichedAuditResult | { error: string }> {
  if (!(await isPlatformAdmin())) return { error: "unauthorized" };
  const prospect = await getProspectById(id);
  if (!prospect) return { error: "Prospect introuvable" };

  const targetUrl = url.trim() || prospect.sourceUrl;
  if (!targetUrl) return { error: "URL invalide" };

  const enriched = await generateEnrichedProspectAudit({
    restaurantName: prospect.restaurantName,
    websiteUrl: targetUrl,
    menu: prospect.menu,
    commissionRatePct: prospect.commissionRatePct,
    assumedMonthlyOrders: prospect.assumedMonthlyOrders,
  });

  await saveProspectAudit(id, enriched.technicalAudit);
  revalidatePath(`/admin/prospects/${id}`);
  return enriched;
}

export async function sendProspectAuditEmailAction(
  id: string,
  recipientEmail: string,
  customMessage?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isPlatformAdmin())) return { ok: false, error: "Non autorisé" };
  if (!recipientEmail || !recipientEmail.includes("@")) {
    return { ok: false, error: "Adresse email invalide" };
  }

  const prospect = await getProspectById(id);
  if (!prospect) return { ok: false, error: "Prospect introuvable" };

  const result = await sendProspectAuditEmail({
    to: recipientEmail.trim(),
    prospect,
    customMessage,
  });

  if (result.ok) {
    await updateProspectStatus(id, "audit_envoye");
    revalidatePath(`/admin/prospects/${id}`);
    revalidatePath("/admin/prospects");
  }

  return result;
}

export async function sendProspectRelanceAction(
  id: string,
  step: 1 | 2,
  recipientEmail: string,
  customMessage?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!(await isPlatformAdmin())) return { ok: false, error: "Non autorisé" };
  if (!recipientEmail || !recipientEmail.includes("@")) {
    return { ok: false, error: "Adresse email invalide" };
  }

  const prospect = await getProspectById(id);
  if (!prospect) return { ok: false, error: "Prospect introuvable" };

  const result = await sendProspectRelanceEmail({
    to: recipientEmail.trim(),
    prospect,
    step,
    customMessage,
  });

  if (result.ok) {
    await recordProspectFollowup(id, step, `Envoyé à ${recipientEmail.trim()}`);
    revalidatePath(`/admin/prospects/${id}`);
    revalidatePath("/admin/prospects");
  }

  return result;
}

