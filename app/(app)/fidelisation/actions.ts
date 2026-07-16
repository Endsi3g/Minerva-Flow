"use server";

import { revalidatePath } from "next/cache";
import {
  createCustomer,
  deleteCustomer,
  logVisit,
  redeemReward,
  createLoyaltyReward,
  deleteLoyaltyReward,
  type CustomerInput,
} from "@/lib/data/customers";
import { updateRestaurantAction } from "@/app/(app)/settings/actions";
import {
  createReferralProgram,
  updateReferralProgramActive,
  deleteReferralProgram,
  type ReferralProgramInput,
} from "@/lib/data/referral-programs";
import type { Customer, LoyaltyReward, ReferralProgram } from "@/lib/types";

export async function createCustomerAction(
  restaurantId: string,
  input: CustomerInput
): Promise<Customer | null> {
  if (!input.name.trim()) return null;
  const customer = await createCustomer(restaurantId, input);
  if (customer) revalidatePath("/fidelisation");
  return customer;
}

export async function deleteCustomerAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteCustomer(restaurantId, id);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

export async function logVisitAction(
  restaurantId: string,
  customerId: string,
  amountSpent: number,
  note?: string | null
): Promise<Customer | null> {
  const customer = await logVisit(restaurantId, customerId, amountSpent, note);
  if (customer) revalidatePath("/fidelisation");
  return customer;
}

export async function redeemRewardAction(
  restaurantId: string,
  customerId: string,
  rewardId: string
): Promise<Customer | null> {
  const customer = await redeemReward(restaurantId, customerId, rewardId);
  if (customer) revalidatePath("/fidelisation");
  return customer;
}

export async function createLoyaltyRewardAction(
  restaurantId: string,
  input: { name: string; pointsCost: number }
): Promise<LoyaltyReward | null> {
  if (!input.name.trim() || !Number.isFinite(input.pointsCost) || input.pointsCost <= 0) return null;
  const reward = await createLoyaltyReward(restaurantId, input);
  if (reward) revalidatePath("/fidelisation");
  return reward;
}

export async function deleteLoyaltyRewardAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteLoyaltyReward(restaurantId, id);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

export async function updateLoyaltyRateAction(restaurantId: string, rate: number): Promise<boolean> {
  if (!Number.isFinite(rate) || rate < 0) return false;
  const restaurant = await updateRestaurantAction(restaurantId, { loyaltyPointsPerDollar: rate });
  if (restaurant) revalidatePath("/fidelisation");
  return Boolean(restaurant);
}

export async function createReferralProgramAction(
  restaurantId: string,
  input: ReferralProgramInput
): Promise<ReferralProgram | null> {
  if (!input.name.trim() || !Number.isFinite(input.goalCount) || input.goalCount < 1) return null;
  const program = await createReferralProgram(restaurantId, input);
  if (program) revalidatePath("/fidelisation");
  return program;
}

export async function updateReferralProgramActiveAction(
  restaurantId: string,
  id: string,
  active: boolean
): Promise<boolean> {
  const ok = await updateReferralProgramActive(restaurantId, id, active);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}

export async function deleteReferralProgramAction(restaurantId: string, id: string): Promise<boolean> {
  const ok = await deleteReferralProgram(restaurantId, id);
  if (ok) revalidatePath("/fidelisation");
  return ok;
}
