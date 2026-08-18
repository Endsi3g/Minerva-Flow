"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import {
  createProspect,
  updateProspectMenu,
  updateProspectMeta,
  updateProspectStatus,
  type CreateProspectInput,
  type UpdateProspectMetaInput,
} from "@/lib/data/prospects";
import { parseMenuText, buildPlaceholderMenu } from "@/lib/prospects/parse-menu";
import type { ProspectMenu, ProspectSourcePlatform, ProspectStatus } from "@/lib/prospects/types";

export type CreateProspectFormInput = {
  sourceUrl: string;
  sourcePlatform: ProspectSourcePlatform;
  restaurantName: string;
  currency: string;
  detectedAddress?: string;
  commissionRatePct: number;
  assumedMonthlyOrders: number;
  pastedText?: string;
};

export async function createProspectAction(
  input: CreateProspectFormInput
): Promise<{ id: string } | null> {
  if (!(await isPlatformAdmin())) return null;
  if (!input.sourceUrl.trim() || !input.restaurantName.trim()) return null;

  const menu: ProspectMenu = input.pastedText?.trim()
    ? parseMenuText(input.pastedText)
    : buildPlaceholderMenu();

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
  const menu = pastedText.trim() ? parseMenuText(pastedText) : buildPlaceholderMenu();
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
