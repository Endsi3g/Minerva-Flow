"use server";

import { revalidatePath } from "next/cache";
import { createProgram, type ProgramInput } from "@/lib/data/programs";
import type { Program } from "@/lib/types";

/**
 * Creates a program for the current restaurant. Authorization is enforced
 * by the revenue_programs RLS policies (owner/manager/staff can write) —
 * this action only guards against obviously malformed input.
 */
export async function createProgramAction(
  restaurantId: string,
  input: ProgramInput
): Promise<Program | null> {
  if (!restaurantId || !input.name.trim() || !input.startDate || !input.endDate) {
    return null;
  }

  const program = await createProgram(restaurantId, input);
  if (program) revalidatePath("/programs");
  return program;
}
