import { describe, expect, it } from "vitest";
import { getAmbassadorPayoutBlockReason } from "../payout-gate";

const mature = {
  status: "payable",
  payableAt: "2026-01-01T00:00:00.000Z",
  approvedAt: "2026-02-01T00:00:00.000Z",
  transferId: null,
  payoutsEnabled: true,
  now: Date.parse("2026-03-01T00:00:00.000Z"),
};

describe("ambassador payout gate", () => {
  it("allows only matured, approved commissions with a verified payout account", () => {
    expect(getAmbassadorPayoutBlockReason(mature)).toBeNull();
  });
  it("requires platform approval", () => {
    expect(getAmbassadorPayoutBlockReason({ ...mature, approvedAt: null })).toBe("approval_required");
  });
  it("keeps commissions locked until 30 days have elapsed", () => {
    expect(getAmbassadorPayoutBlockReason({ ...mature, payableAt: "2026-03-02T00:00:00.000Z" })).toBe("not_mature");
  });
  it("requires Stripe payout capability", () => {
    expect(getAmbassadorPayoutBlockReason({ ...mature, payoutsEnabled: false })).toBe("account_incomplete");
  });
  it("does not repeat an existing transfer", () => {
    expect(getAmbassadorPayoutBlockReason({ ...mature, transferId: "tr_existing" })).toBe("already_paid");
  });
  it("blocks cancelled commissions", () => {
    expect(getAmbassadorPayoutBlockReason({ ...mature, status: "void" })).toBe("invalid_status");
  });
});
