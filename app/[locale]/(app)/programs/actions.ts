"use server";

import { revalidatePath } from "next/cache";
import {
  createProgram,
  updateProgram,
  deleteProgram,
  createProgramNote,
  type ProgramInput,
  type ProgramNote,
} from "@/lib/data/programs";
import type { Program, ProgramStatus } from "@/lib/types";

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

export async function updateProgramStatusAction(
  restaurantId: string,
  id: string,
  status: ProgramStatus
): Promise<Program | null> {
  const program = await updateProgram(restaurantId, id, { status });
  if (program) revalidatePath("/programs");
  return program;
}

export async function deleteProgramAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteProgram(restaurantId, id);
  if (ok) revalidatePath("/programs");
  return ok;
}

export async function createProgramNoteAction(
  restaurantId: string,
  programId: string,
  text: string
): Promise<ProgramNote | null> {
  if (!text.trim()) return null;
  const note = await createProgramNote(restaurantId, programId, text.trim());
  if (note) revalidatePath("/programs");
  return note;
}
