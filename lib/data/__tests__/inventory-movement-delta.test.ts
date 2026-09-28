import { describe, expect, it } from "vitest";
import { computeInventoryMovementDelta } from "../inventory";

describe("computeInventoryMovementDelta", () => {
  it("reception is always a gain, regardless of the sign given", () => {
    expect(computeInventoryMovementDelta("reception", 5)).toBe(5);
    expect(computeInventoryMovementDelta("reception", -5)).toBe(5);
  });

  it("utilisation is always a loss, regardless of the sign given", () => {
    expect(computeInventoryMovementDelta("utilisation", 3)).toBe(-3);
    expect(computeInventoryMovementDelta("utilisation", -3)).toBe(-3);
  });

  it("gaspillage is always a loss, regardless of the sign given", () => {
    expect(computeInventoryMovementDelta("gaspillage", 2)).toBe(-2);
    expect(computeInventoryMovementDelta("gaspillage", -2)).toBe(-2);
  });

  it("ajustement carries the caller's sign through as-is, in either direction", () => {
    expect(computeInventoryMovementDelta("ajustement", 4)).toBe(4);
    expect(computeInventoryMovementDelta("ajustement", -4)).toBe(-4);
  });
});
