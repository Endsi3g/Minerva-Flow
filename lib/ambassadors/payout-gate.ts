export type AmbassadorPayoutGateInput = {
  status: string;
  payableAt: string;
  approvedAt: string | null;
  transferId: string | null;
  payoutsEnabled: boolean;
  now?: number;
};

export type AmbassadorPayoutBlockReason =
  | "already_paid"
  | "approval_required"
  | "not_mature"
  | "invalid_status"
  | "account_incomplete";

export function getAmbassadorPayoutBlockReason(input: AmbassadorPayoutGateInput): AmbassadorPayoutBlockReason | null {
  if (input.transferId || input.status === "paid") return "already_paid";
  if (!input.approvedAt) return "approval_required";
  const payableAt = new Date(input.payableAt).getTime();
  if (!Number.isFinite(payableAt) || payableAt > (input.now ?? Date.now())) return "not_mature";
  if (input.status !== "pending" && input.status !== "payable") return "invalid_status";
  if (!input.payoutsEnabled) return "account_incomplete";
  return null;
}
