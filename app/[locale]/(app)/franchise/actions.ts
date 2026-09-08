"use server";

import { revalidatePath } from "next/cache";
import { updateWorkspaceLogo } from "@/lib/data/workspaces";

export async function updateWorkspaceLogoAction(workspaceId: string, logoUrl: string | null): Promise<boolean> {
  const ok = await updateWorkspaceLogo(workspaceId, logoUrl);
  if (ok) revalidatePath("/franchise");
  return ok;
}
