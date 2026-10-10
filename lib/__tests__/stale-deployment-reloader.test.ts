import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("StaleDeploymentReloader detection logic", () => {
  function isStaleActionError(value: unknown): boolean {
    if (!value) return false;
    const str =
      typeof value === "string"
        ? value
        : value instanceof Error
        ? `${value.name} ${value.message} ${(value as { digest?: string }).digest ?? ""}`
        : String(value);

    const lower = str.toLowerCase();
    return (
      lower.includes("failed to find server action") ||
      lower.includes("unrecognizedactionerror") ||
      lower.includes("older deployment") ||
      lower.includes("action not found")
    );
  }

  it("identifies Next.js UnrecognizedActionError", () => {
    const error = new Error("Failed to find Server Action 'a1b2c3d4'. This request might be from an older deployment.");
    expect(isStaleActionError(error)).toBe(true);
  });

  it("identifies error by class name or custom text", () => {
    const error = new Error("UnrecognizedActionError: action not found on server");
    expect(isStaleActionError(error)).toBe(true);
  });

  it("identifies plain string rejection reason", () => {
    expect(isStaleActionError("Failed to find Server Action xxxx")).toBe(true);
  });

  it("does not trigger on unrelated validation or business errors", () => {
    const normalError = new Error("Le courriel est invalide ou déjà pris.");
    expect(isStaleActionError(normalError)).toBe(false);
  });

  it("does not trigger on standard network timeout", () => {
    const timeoutError = new Error("Network request timed out");
    expect(isStaleActionError(timeoutError)).toBe(false);
  });
});
