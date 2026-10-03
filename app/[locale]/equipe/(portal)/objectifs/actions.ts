"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTeamPortalAccess } from "@/lib/data/team-portal";
import { writeGoal } from "@/lib/data/team-goals";

export async function saveGoalAction(metric: string, target: number): Promise<boolean> {
  const access = await getTeamPortalAccess();
  if (!access?.isTeamMember) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const ok = await writeGoal(supabase, user.id, metric, target);
  if (ok) revalidatePath("/[locale]/equipe/objectifs", "page");
  return ok;
}
